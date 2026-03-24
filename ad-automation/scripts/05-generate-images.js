require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const geminiConfig = require(path.join(__dirname, '..', 'config', 'gemini-config.json'));

function getLatestCopy() {
  const copyDir = path.join(__dirname, '..', 'data', 'copy');
  const files = fs.readdirSync(copyDir)
    .filter(f => f.startsWith('copy-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('Copy dosyasi bulunamadi. Once 03-generate-copy.js calistirin.');
  }

  const latestFile = files[0];
  const data = JSON.parse(fs.readFileSync(path.join(copyDir, latestFile), 'utf-8'));
  return { fileName: latestFile, data };
}

function promptHash(prompt) {
  return crypto.createHash('md5').update(prompt).digest('hex').slice(0, 12);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(genAI, prompt, outputPath) {
  // Nano Banana Pro 2 (gemini-3.1-flash-image-preview) — requires TEXT + IMAGE modalities
  const model = genAI.getGenerativeModel({ model: geminiConfig.model });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  });

  const response = result.response;
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('Nano Banana Pro 2 bos yanit dondurdu');
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      return true;
    }
  }

  throw new Error('Nano Banana Pro 2 yaniti gorsel icermiyor');
}

async function generateImages(options) {
  const opts = options || {};
  const maxImages = opts.max || geminiConfig.max_images;
  const sector = opts.sector || null;

  // API key kontrolu
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY bulunamadi. .env dosyasina GEMINI_API_KEY ekleyin.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const { fileName, data } = getLatestCopy();
  const variations = data.variations;

  console.log(`Copy dosyasi: ${fileName}`);
  console.log(`Toplam varyasyon: ${variations.length}`);
  console.log(`Model: ${geminiConfig.model} (Nano Banana Pro 2)`);
  console.log(`Max gorsel: ${maxImages}`);
  if (sector) console.log(`Sektor: ${sector}`);
  console.log('');

  // Cikti klasoru
  const today = new Date().toISOString().split('T')[0];
  const outputDir = path.join(__dirname, '..', 'assets', 'generated', today);
  fs.mkdirSync(outputDir, { recursive: true });

  // Cache klasoru (prompt hash -> dosya eslestirmesi)
  const cacheFile = path.join(outputDir, '.cache.json');
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')); } catch { cache = {}; }
  }

  const images = [];
  let generated = 0;
  let cached = 0;
  let failed = 0;

  // image_prompt iceren varyasyonlari filtrele
  const withPrompts = variations.filter(v => v.image_prompt);
  const toGenerate = withPrompts.slice(0, maxImages);

  if (toGenerate.length === 0) {
    console.log('UYARI: Hicbir varyasyonda image_prompt bulunamadi.');
    console.log('03-generate-copy.js\'i --sector parametresiyle tekrar calistirin.');
    return { totalGenerated: 0, outputDir, images: [] };
  }

  console.log(`Gorsel uretilecek varyasyon: ${toGenerate.length}\n`);

  for (let i = 0; i < toGenerate.length; i++) {
    const variation = toGenerate[i];
    const hash = promptHash(variation.image_prompt);
    const imgFileName = `img-${String(i + 1).padStart(3, '0')}-${hash}.png`;
    const outputPath = path.join(outputDir, imgFileName);

    // Cache kontrolu
    if (cache[hash] && fs.existsSync(path.join(outputDir, cache[hash]))) {
      console.log(`[${i + 1}/${toGenerate.length}] CACHE: ${variation.angle} — ${cache[hash]}`);
      images.push(path.join(outputDir, cache[hash]));
      cached++;
      continue;
    }

    console.log(`[${i + 1}/${toGenerate.length}] URETILIYOR: ${variation.angle}`);
    console.log(`  Prompt: ${variation.image_prompt.slice(0, 80)}...`);

    try {
      await generateImage(genAI, variation.image_prompt, outputPath);
      cache[hash] = imgFileName;
      images.push(outputPath);
      generated++;
      console.log(`  OK: ${imgFileName}`);
    } catch (err) {
      console.log(`  HATA: ${err.message}`);
      failed++;
    }

    // Rate limiting — son istek degilse bekle
    if (i < toGenerate.length - 1) {
      await sleep(geminiConfig.rate_limit_ms);
    }
  }

  // Cache kaydet
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');

  // Ozet
  console.log('\n=== GORSEL URETIMI TAMAMLANDI (Nano Banana Pro 2) ===');
  console.log(`Yeni uretilen: ${generated}`);
  console.log(`Cache\'den: ${cached}`);
  console.log(`Basarisiz: ${failed}`);
  console.log(`Toplam gorsel: ${images.length}`);
  console.log(`Cikti klasoru: ${outputDir}`);

  return { totalGenerated: generated, cached, failed, outputDir, images };
}

if (require.main === module) {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    }
  }

  generateImages({
    max: args.max ? parseInt(args.max) : undefined,
    sector: args.sector || undefined
  }).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = generateImages;
