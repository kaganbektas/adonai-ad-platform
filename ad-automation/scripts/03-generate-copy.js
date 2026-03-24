require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const claudeConfig = require(path.join(__dirname, '..', 'config', 'claude-config.json'));
const sectorsConfig = require(path.join(__dirname, '..', 'config', 'sectors.json'));

const ANGLES = ['aciliyet', 'fayda_odakli', 'soru_formati', 'sosyal_kanit', 'fiyat_vurgusu'];

function getLatestAnalysis() {
  const analysisDir = path.join(__dirname, '..', 'data', 'analysis');
  const files = fs.readdirSync(analysisDir)
    .filter(f => f.startsWith('analysis-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('Analiz dosyasi bulunamadi. Once 02-analyze.js calistirin.');
  }

  const latestFile = files[0];
  const data = JSON.parse(fs.readFileSync(path.join(analysisDir, latestFile), 'utf-8'));
  return { fileName: latestFile, data };
}

function buildPrompt(ad, platformLimits, sector) {
  const limits = platformLimits.meta;
  const patterns = ad.success_patterns.length > 0
    ? ad.success_patterns.join(', ')
    : 'genel basarili yapi';

  let imagePromptHint = '';
  if (sector && sectorsConfig[sector] && sectorsConfig[sector].image_prompt_template) {
    imagePromptHint = `\n\nGorsel uretimi icin referans sablon: "${sectorsConfig[sector].image_prompt_template}"
Bu sablonu temel alarak her varyasyon icin urun/hizmete ozel bir image_prompt uret.`;
  }

  return `Orijinal basarili reklam:
- Headline: "${ad.headline}"
- Description: "${ad.description}"
- Basari patternlari: ${patterns}
- Metrikler: CTR %${ad.metrics.ctr}, ROAS ${ad.metrics.roas}, CPA $${ad.metrics.cpa}

Platform: Meta Ads
Karakter limitleri: Headline max ${limits.headline} karakter, Description max ${limits.description} karakter

Bu reklamdan ilham alarak 5 farkli varyasyon uret. Her varyasyon farkli bir aci kullanacak:
1. aciliyet — zamana karsi yaristiran, kacirilmamasi gereken firsat hissi
2. fayda_odakli — urunun/hizmetin somut faydasini one cikaran
3. soru_formati — hedef kitleye soru sorarak dikkat ceken
4. sosyal_kanit — baskalarinin deneyimini/sayilari kullanan
5. fiyat_vurgusu — fiyat avantajini/indirimi one cikaran

Her varyasyon icin ayrica bir "image_prompt" alani uret. Bu prompt Gemini AI ile gorsel uretmek icin kullanilacak. image_prompt kurallari:
- Ingilizce yaz
- Profesyonel fotograf tarzinda, detayli sahne tarifi
- Arka plan temiz olsun
- Kesinlikle metin, logo veya watermark icermesin
- Urun/hizmeti acikca tanimla${imagePromptHint}

ONEMLI: Turkce yaz (image_prompt haric — o Ingilizce). Turkce karakterleri (ı, ş, ç, ö, ü, ğ, İ, Ş, Ç, Ö, Ü, Ğ) kesinlikle dogru kullan. Asla i yerine ı, s yerine ş yazmayi unutma. Karakter limitlerini kesinlikle asma. "angle" degerlerini AYNEN yaz: aciliyet, fayda_odakli, soru_formati, sosyal_kanit, fiyat_vurgusu.

Yaniti SADECE asagidaki JSON formatinda ver, baska hicbir sey yazma:
[
  {"headline": "...", "description": "...", "angle": "aciliyet", "image_prompt": "..."},
  {"headline": "...", "description": "...", "angle": "fayda_odakli", "image_prompt": "..."},
  {"headline": "...", "description": "...", "angle": "soru_formati", "image_prompt": "..."},
  {"headline": "...", "description": "...", "angle": "sosyal_kanit", "image_prompt": "..."},
  {"headline": "...", "description": "...", "angle": "fiyat_vurgusu", "image_prompt": "..."}
]`;
}

function validateAndTag(variations, platformLimits, adName) {
  const limits = platformLimits.meta;
  const warnings = [];

  for (const v of variations) {
    v.based_on = adName;
    v.platform = 'meta';
    v.char_count = {
      headline: v.headline.length,
      description: v.description.length
    };

    if (v.headline.length > limits.headline) {
      warnings.push(`${adName} / ${v.angle}: Headline ${v.headline.length} karakter (limit: ${limits.headline}) — "${v.headline}"`);
    }
    if (v.description.length > limits.description) {
      warnings.push(`${adName} / ${v.angle}: Description ${v.description.length} karakter (limit: ${limits.description}) — "${v.description}"`);
    }
  }

  return warnings;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateCopy(options) {
  const opts = options || {};
  const sector = opts.sector || null;

  // API key kontrolü
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY bulunamadi. .env dosyasina gecerli bir ANTHROPIC_API_KEY girin.');
  }

  const client = new Anthropic();

  const { fileName, data } = getLatestAnalysis();
  const topPerformers = data.top_performers;

  console.log(`Analiz dosyasi: ${fileName}`);
  console.log(`Top performer sayisi: ${topPerformers.length}`);
  console.log(`Model: ${claudeConfig.model}`);
  if (sector) console.log(`Sektor: ${sector} (image_prompt sablonu aktif)`);
  console.log('');

  const allVariations = [];
  const allWarnings = [];

  for (let i = 0; i < topPerformers.length; i++) {
    const ad = topPerformers[i];
    console.log(`[${i + 1}/${topPerformers.length}] ${ad.ad_name}: "${ad.headline}" icin varyasyonlar uretiliyor...`);

    const prompt = buildPrompt(ad, claudeConfig.platform_limits, sector);

    const message = await client.messages.create({
      model: claudeConfig.model,
      max_tokens: claudeConfig.max_tokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: 'Sen deneyimli bir dijital reklam copywriter\'isin. Sadece Turkce yaz (image_prompt alani haric — o Ingilizce). Turkce karakterleri (ı, ş, ç, ö, ü, ğ, İ, Ş, Ç, Ö, Ü, Ğ) kesinlikle dogru kullan. Her varyasyon icin bir image_prompt alani da uret — bu Gemini AI ile gorsel uretmek icin kullanilacak. Yanit olarak SADECE istenilen JSON formatini dondur, baska hicbir sey yazma.'
    });

    // Yanıttan JSON parse et
    const responseText = message.content[0].text.trim();
    let variations;

    try {
      variations = JSON.parse(responseText);
    } catch {
      // JSON bloğu içinde olabilir
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        variations = JSON.parse(jsonMatch[0]);
      } else {
        console.error(`  UYARI: ${ad.ad_name} icin JSON parse edilemedi. Atlaniyor.`);
        continue;
      }
    }

    // Doğrula ve etiketle
    const warnings = validateAndTag(variations, claudeConfig.platform_limits, ad.ad_name);
    allWarnings.push(...warnings);
    allVariations.push(...variations);

    console.log(`  ${variations.length} varyasyon uretildi.`);

    // Rate limiting — son istek değilse bekle
    if (i < topPerformers.length - 1) {
      await sleep(500);
    }
  }

  // Sonucu kaydet
  const today = new Date().toISOString().split('T')[0];
  const result = {
    generation_date: today,
    based_on_analysis: fileName,
    model: claudeConfig.model,
    sector: sector,
    variations: allVariations,
    total_variations: allVariations.length,
    warnings: allWarnings
  };

  const outputPath = path.join(__dirname, '..', 'data', 'copy', `copy-${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  // Özet
  console.log('\n=== URETIM TAMAMLANDI ===');
  console.log(`Toplam varyasyon: ${allVariations.length}`);

  if (allWarnings.length > 0) {
    console.log(`\n[UYARI] Karakter limiti asan ${allWarnings.length} metin:`);
    for (const w of allWarnings) {
      console.log(`  - ${w}`);
    }
  } else {
    console.log('Tum metinler karakter limitlerinde.');
  }

  console.log(`\nSonuc yazildi: ${outputPath}`);
  return result;
}

if (require.main === module) {
  const sector = process.argv.find(a => a.startsWith('--sector='));
  const opts = sector ? { sector: sector.split('=')[1] } : {};
  generateCopy(opts).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = generateCopy;
