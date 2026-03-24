const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const sectorsConfig = require(path.join(__dirname, '..', 'config', 'sectors.json'));

const ANGLE_TEMPLATE_MAP = {
  'aciliyet': 'urgency',
  'fayda_odakli': 'minimal',
  'soru_formati': 'product-focused',
  'sosyal_kanit': 'social-proof',
  'fiyat_vurgusu': 'gradient'
};

const TEMPLATE_DEFAULTS = {
  'minimal': { bg_color: '#fafafa', accent_color: '#6c5ce7', cta: 'Hemen Al' },
  'product-focused': { bg_color: '#ffffff', accent_color: '#00b894', cta: 'Keşfet' },
  'gradient': { bg_color: '#1a0533', accent_color: '#00e5ff', cta: 'Fırsatı Yakala' },
  'social-proof': { bg_color: '#fffdf7', accent_color: '#e65100', cta: 'Hemen Dene' },
  'urgency': { bg_color: '#b71c1c', accent_color: '#ffeb3b', cta: 'Hemen Al' }
};

const SIZES = [
  { name: 'feed', file: 'feed-1080x1080.html', width: 1080, height: 1080 },
  { name: 'story', file: 'story-1080x1920.html', width: 1080, height: 1920 },
  { name: 'landscape', file: 'landscape-1200x628.html', width: 1200, height: 628 }
];

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

function getDefaults(templateName, sector) {
  if (sector && sectorsConfig[sector] && sectorsConfig[sector].styles[templateName]) {
    return sectorsConfig[sector].styles[templateName];
  }
  return TEMPLATE_DEFAULTS[templateName];
}

function getTemplatePath(templateName, sizeFile, sector) {
  if (sector) {
    return path.join(__dirname, '..', 'templates', sector, templateName, sizeFile);
  }
  return path.join(__dirname, '..', 'templates', templateName, sizeFile);
}

function loadImages(imagesDir) {
  if (!imagesDir) return [];
  const absDir = path.resolve(imagesDir);
  if (!fs.existsSync(absDir)) {
    console.log(`UYARI: Gorsel klasoru bulunamadi: ${absDir}`);
    return [];
  }
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  return fs.readdirSync(absDir)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map(f => path.join(absDir, f));
}

function imageToDataUri(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
  const mime = mimeMap[ext] || 'image/jpeg';
  const data = fs.readFileSync(imagePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

function fillTemplate(html, variation, defaults, imageDataUri) {
  return html
    .replace(/\{\{headline\}\}/g, variation.headline)
    .replace(/\{\{description\}\}/g, variation.description)
    .replace(/\{\{cta\}\}/g, defaults.cta)
    .replace(/\{\{bg_color\}\}/g, defaults.bg_color)
    .replace(/\{\{accent_color\}\}/g, defaults.accent_color)
    .replace(/\{\{logo\}\}/g, '')
    .replace(/\{\{product_image\}\}/g, imageDataUri || '')
    .replace(/\{\{image_display\}\}/g, imageDataUri ? 'block' : 'none')
    .replace(/\{\{placeholder_display\}\}/g, imageDataUri ? 'none' : 'flex');
}

async function renderAds(options) {
  // Geriye uyumlu: sayı verilirse maxVariations olarak al
  const opts = typeof options === 'number' ? { maxVariations: options } : (options || {});
  const limit = opts.maxVariations || 10;
  const templateFilter = opts.templates || null;
  const sizeFilter = opts.sizes || null;
  const sector = opts.sector || null;
  const imageFiles = loadImages(opts.images);

  // Sektör doğrulama
  if (sector && !sectorsConfig[sector]) {
    throw new Error(
      `Bilinmeyen sektor: "${sector}". Mevcut sektorler: ${Object.keys(sectorsConfig).join(', ')}`
    );
  }

  const activeSizes = sizeFilter
    ? SIZES.filter(s => sizeFilter.includes(s.name))
    : SIZES;

  const { fileName, data } = getLatestCopy();

  console.log(`Copy dosyasi: ${fileName}`);
  console.log(`Toplam varyasyon: ${data.variations.length}`);
  console.log(`Render edilecek: ilk ${limit} varyasyon x ${activeSizes.length} boyut`);
  if (sector) console.log(`Sektor: ${sectorsConfig[sector].label}`);
  if (templateFilter) console.log(`Template filtresi: ${templateFilter.join(', ')}`);
  if (sizeFilter) console.log(`Boyut filtresi: ${sizeFilter.join(', ')}`);
  if (imageFiles.length > 0) console.log(`Gorsel sayisi: ${imageFiles.length} dosya`);
  console.log('');

  const today = new Date().toISOString().split('T')[0];
  const outputBase = path.join(__dirname, '..', 'data', 'output', today);

  // Puppeteer başlat
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let totalRendered = 0;

  const variations = data.variations.slice(0, limit);

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const templateName = ANGLE_TEMPLATE_MAP[variation.angle];

    if (!templateName) {
      console.log(`  UYARI: "${variation.angle}" icin template bulunamadi, atlaniyor.`);
      continue;
    }

    // Template filtresi kontrolü
    if (templateFilter && !templateFilter.includes(templateName)) {
      continue;
    }

    const imageDataUri = imageFiles.length > 0
      ? imageToDataUri(imageFiles[i % imageFiles.length])
      : null;

    console.log(`[${i + 1}/${variations.length}] ${variation.based_on} / ${variation.angle} → ${templateName}${imageDataUri ? ' (+gorsel)' : ''}`);

    const defaults = getDefaults(templateName, sector);

    for (const size of activeSizes) {
      const templatePath = getTemplatePath(templateName, size.file, sector);

      if (!fs.existsSync(templatePath)) {
        console.log(`  UYARI: Template bulunamadi: ${templatePath}`);
        continue;
      }

      const templateHtml = fs.readFileSync(templatePath, 'utf-8');
      const filledHtml = fillTemplate(templateHtml, variation, defaults, imageDataUri);

      // Çıktı klasörü
      const outputDir = path.join(outputBase, templateName, size.name);
      fs.mkdirSync(outputDir, { recursive: true });

      const outputFile = path.join(outputDir, `reklam-${String(i + 1).padStart(3, '0')}.png`);

      // Render
      await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
      await page.setContent(filledHtml, { waitUntil: 'load', timeout: 30000 });
      // Font yüklenmesi için kısa bekleme
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: outputFile, type: 'png' });

      totalRendered++;
    }

    console.log(`  ${activeSizes.length} boyut render edildi.`);
  }

  await browser.close();

  console.log(`\n=== RENDER TAMAMLANDI ===`);
  console.log(`Toplam gorsel: ${totalRendered}`);
  console.log(`Cikti klasoru: ${outputBase}`);

  // Klasör özeti
  const templates = fs.readdirSync(outputBase);
  for (const t of templates) {
    const tPath = path.join(outputBase, t);
    if (!fs.statSync(tPath).isDirectory()) continue;
    const sizes = fs.readdirSync(tPath);
    for (const s of sizes) {
      const sPath = path.join(tPath, s);
      if (!fs.statSync(sPath).isDirectory()) continue;
      const files = fs.readdirSync(sPath).filter(f => f.endsWith('.png'));
      console.log(`  ${t}/${s}: ${files.length} gorsel`);
    }
  }

  return { totalRendered, outputBase };
}

if (require.main === module) {
  const maxVariations = parseInt(process.argv[2]) || 10;
  renderAds(maxVariations).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = renderAds;
