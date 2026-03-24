require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const claudeConfig = require(path.join(__dirname, '..', 'config', 'claude-config.json'));

// ==================== WEBSITE ICERIK CEKME ====================

async function fetchWebsiteContent(url) {
  console.log(`Website icerigi cekiliyor: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    clearTimeout(timeout);

    // Gereksiz tag'leri temizle
    let cleaned = html;
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');

    // HTML tag'lerini kaldir, text content'i cikar
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // HTML entity'lerini coz
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&nbsp;/g, ' ');

    // Fazla bosluk ve satirlari temizle
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Max 8000 karakter
    if (cleaned.length > 8000) {
      cleaned = cleaned.slice(0, 8000);
    }

    console.log(`  Icerik uzunlugu: ${cleaned.length} karakter`);
    return cleaned;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Website zaman asimina ugradi (15s): ${url}`);
    }
    throw new Error(`Website erisilemedi: ${err.message}`);
  }
}

// ==================== CLAUDE ANALIZ ====================

async function analyzeWithClaude(websiteContent, url) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY bulunamadi. .env dosyasini kontrol edin.');
  }

  const client = new Anthropic();

  const prompt = `Asagida bir website'in icerik metni var. Bu website'i analiz et ve istenilen bilgileri cikar.

Website URL: ${url}
Website Icerigi (ilk 8000 karakter):
${websiteContent}

Analiz et ve SADECE JSON formatinda yanit ver:

1. sector: Asagidaki 5 sektorden en uygun olani sec:
   - "yemek" (restoran, cafe, yemek siparisi, gida)
   - "teknoloji" (yazilim, donanim, SaaS, e-ticaret platformu)
   - "hizmet" (danismanlik, temizlik, nakliyat, saglik)
   - "moda" (giyim, aksesuar, ayakkabi, kozmetik)
   - "egitim" (kurs, okul, universite, online egitim)

2. sector_confidence: "yuksek", "orta" veya "dusuk"

3. business_type: Isletme turu (ornek: "online yemek siparisi", "SaaS platformu", "giyim e-ticaret")

4. product_categories: Urun/hizmet kategorileri (max 5 madde)

5. brand_tone: Marka tonu
   - primary: "resmi" | "samimi" | "genc" | "profesyonel" | "eglenceli"
   - secondary: Ikincil ton (veya null)
   - description: Kisa aciklama

6. target_audience: Hedef kitle
   - demographics: Yas araligi, cinsiyet
   - interests: Ilgi alanlari listesi
   - description: Kisa aciklama

7. unique_selling_points: Bu markanin one cikan ozellikleri (max 5 madde, her biri kisa string)

8. competitors: Turkiye pazarindaki en yakin 3-5 rakip
   - name: Marka adi
   - reason: Neden rakip oldugu (kisa)

SADECE asagidaki JSON formatinda yanit ver:
{
  "sector": "...",
  "sector_confidence": "...",
  "business_type": "...",
  "product_categories": ["...", "..."],
  "brand_tone": { "primary": "...", "secondary": "...", "description": "..." },
  "target_audience": { "demographics": "...", "interests": ["..."], "description": "..." },
  "unique_selling_points": ["...", "..."],
  "competitors": [{ "name": "...", "reason": "..." }]
}`;

  console.log('Claude ile marka analizi yapiliyor...');

  const message = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: claudeConfig.max_tokens,
    messages: [{ role: 'user', content: prompt }],
    system: 'Sen deneyimli bir dijital pazarlama ve marka stratejistisin. Turkiye pazarini iyi biliyorsun. Turkce yaz. Yanit olarak SADECE istenilen JSON formatini dondur.'
  });

  const responseText = message.content[0].text.trim();

  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Claude yaniti JSON olarak parse edilemedi.');
  }
}

// ==================== ANA FONKSIYON ====================

async function brandAnalysis(options) {
  const opts = options || {};
  const url = opts.url;

  if (!url) {
    throw new Error('URL belirtilmedi. --url=https://example.com');
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Gecersiz URL. http:// veya https:// ile baslamali.');
  }

  console.log(`\n=== MARKA ANALIZI ===`);
  console.log(`URL: ${url}\n`);

  // Website icerigini cek
  const content = await fetchWebsiteContent(url);

  if (!content || content.length < 50) {
    throw new Error('Website icerigi cok kisa veya bos. Analiz yapilamadi.');
  }

  // Claude ile analiz
  const claudeAnalysis = await analyzeWithClaude(content, url);

  if (!claudeAnalysis) {
    throw new Error('Claude marka analizi basarisiz.');
  }

  console.log('Marka analizi tamamlandi.');

  // Sektor validasyonu
  const validSectors = ['yemek', 'teknoloji', 'hizmet', 'moda', 'egitim'];
  if (!validSectors.includes(claudeAnalysis.sector)) {
    console.log(`UYARI: Tespit edilen sektor "${claudeAnalysis.sector}" gecersiz, "hizmet" olarak ayarlaniyor.`);
    claudeAnalysis.sector = 'hizmet';
  }

  // Sonucu kaydet
  const today = new Date().toISOString().split('T')[0];
  const result = {
    analysis_date: today,
    url: url,
    content_length: content.length,
    claude_analysis: {
      model: claudeConfig.model,
      ...claudeAnalysis
    }
  };

  const outputDir = path.join(__dirname, '..', 'data', 'analysis');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `brand-${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n=== MARKA ANALIZI TAMAMLANDI ===`);
  console.log(`Sektor: ${claudeAnalysis.sector} (guven: ${claudeAnalysis.sector_confidence})`);
  console.log(`Is turu: ${claudeAnalysis.business_type}`);
  console.log(`Marka tonu: ${claudeAnalysis.brand_tone ? claudeAnalysis.brand_tone.primary : '-'}`);
  console.log(`Hedef kitle: ${claudeAnalysis.target_audience ? claudeAnalysis.target_audience.description : '-'}`);
  console.log(`USP sayisi: ${claudeAnalysis.unique_selling_points ? claudeAnalysis.unique_selling_points.length : 0}`);
  console.log(`Rakip sayisi: ${claudeAnalysis.competitors ? claudeAnalysis.competitors.length : 0}`);
  if (claudeAnalysis.competitors && claudeAnalysis.competitors.length > 0) {
    console.log(`Rakipler: ${claudeAnalysis.competitors.map(c => c.name).join(', ')}`);
  }
  console.log(`Sonuc: ${outputPath}`);

  return result;
}

// ==================== CLI ====================

if (require.main === module) {
  const urlArg = process.argv.find(a => a.startsWith('--url='));
  const url = urlArg ? urlArg.split('=').slice(1).join('=') : null;

  if (!url) {
    console.error('Kullanim: node scripts/09-brand-analysis.js --url=https://example.com');
    process.exit(1);
  }

  brandAnalysis({ url }).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = brandAnalysis;
