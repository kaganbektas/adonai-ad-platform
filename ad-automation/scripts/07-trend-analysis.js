require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const claudeConfig = require(path.join(__dirname, '..', 'config', 'claude-config.json'));

// ==================== ANALIZ DOSYASI ====================

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

// ==================== CLAUDE ANALIZ ====================

async function analyzeWithClaude(topPerformers, sector) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    console.error('UYARI: ANTHROPIC_API_KEY bulunamadi, Claude analizi atlaniyor.');
    return null;
  }

  const client = new Anthropic();

  // Top performer verilerini ozetle
  let performerSummary = '';
  for (const ad of topPerformers) {
    performerSummary += `\n- Headline: "${ad.headline}"`;
    if (ad.description) performerSummary += `\n  Description: "${ad.description}"`;
    performerSummary += `\n  Patternlar: ${ad.success_patterns.join(', ') || 'belirtilmemis'}`;
    performerSummary += `\n  Metrikler: CTR %${ad.metrics.ctr}, ROAS ${ad.metrics.roas}, CPA $${ad.metrics.cpa}`;
    performerSummary += '\n';
  }

  const sectorInfo = sector ? `\nSektor: ${sector}\n` : '';

  const prompt = `Asagida yuksek performansli reklamlarin verileri var. Bu reklamlardaki basari patternlerini analiz et ve stratejik trend raporu olustur.
${sectorInfo}
## Yuksek Performansli Reklamlar (${topPerformers.length} adet)
${performerSummary}

Asagidaki alanlari analiz et ve SADECE JSON formatinda yanit ver:

1. top_trends: En sik kullanilan basarili temalar/stratejiler. Her biri icin:
   - trend: Trend adi
   - frequency: "yuksek", "orta" veya "dusuk"
   - example: Reklamlardan ornek

2. emotional_triggers: Kullanilan duygusal tetikleyiciler. Her biri icin:
   - trigger: Tetikleyici adi (FOMO, guven, merak, vb.)
   - impact: "yuksek", "orta" veya "dusuk"
   - usage: Nasil kullanildigi

3. seasonal_opportunities: Mevsimsel firsatlar ve donemler. Her biri icin:
   - period: Donem adi
   - opportunity: Firsat aciklamasi
   - timing: Zamanlama

4. recommended_angles: Yeni denenebilecek acilar. Her biri icin:
   - angle: Aci adi
   - rationale: Neden onerildi
   - example_headline: Ornek headline

SADECE asagidaki JSON formatinda yanit ver:
{
  "top_trends": [{ "trend": "...", "frequency": "...", "example": "..." }],
  "emotional_triggers": [{ "trigger": "...", "impact": "...", "usage": "..." }],
  "seasonal_opportunities": [{ "period": "...", "opportunity": "...", "timing": "..." }],
  "recommended_angles": [{ "angle": "...", "rationale": "...", "example_headline": "..." }]
}`;

  const message = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: claudeConfig.max_tokens,
    messages: [{ role: 'user', content: prompt }],
    system: 'Sen deneyimli bir dijital pazarlama trend analistisin. Turkce yaz. Turkce karakterleri dogru kullan. Yanit olarak SADECE istenilen JSON formatini dondur.'
  });

  const responseText = message.content[0].text.trim();

  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        // Try cleaning common JSON issues (trailing commas)
        const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch {
        console.error('UYARI: Claude yaniti JSON olarak parse edilemedi.');
        return null;
      }
    }
    console.error('UYARI: Claude yanitinda JSON bulunamadi.');
    return null;
  }
}

// ==================== ANA FONKSIYON ====================

async function trendAnalysis(options) {
  const opts = options || {};
  const sector = opts.sector || null;

  const { fileName, data } = getLatestAnalysis();
  const topPerformers = data.top_performers;

  console.log(`Analiz dosyasi: ${fileName}`);
  console.log(`Top performer sayisi: ${topPerformers.length}`);
  if (sector) console.log(`Sektor: ${sector}`);
  console.log('');

  if (topPerformers.length === 0) {
    throw new Error('Top performer bulunamadi. Trend analizi icin en az 1 yuksek performansli reklam gerekli.');
  }

  console.log('Claude ile trend analizi yapiliyor...');
  const claudeAnalysis = await analyzeWithClaude(topPerformers, sector);

  if (!claudeAnalysis) {
    throw new Error('Claude trend analizi basarisiz.');
  }

  console.log('Trend analizi tamamlandi.');

  // Sonucu kaydet
  const today = new Date().toISOString().split('T')[0];
  const result = {
    analysis_date: today,
    sector: sector,
    based_on_analysis: fileName,
    top_performers_analyzed: topPerformers.length,
    claude_analysis: {
      model: claudeConfig.model,
      ...claudeAnalysis
    }
  };

  const outputDir = path.join(__dirname, '..', 'data', 'analysis');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `trends-${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n=== TREND ANALIZI TAMAMLANDI ===`);
  console.log(`Trend: ${claudeAnalysis.top_trends ? claudeAnalysis.top_trends.length : 0}`);
  console.log(`Duygusal tetikleyici: ${claudeAnalysis.emotional_triggers ? claudeAnalysis.emotional_triggers.length : 0}`);
  console.log(`Mevsimsel firsat: ${claudeAnalysis.seasonal_opportunities ? claudeAnalysis.seasonal_opportunities.length : 0}`);
  console.log(`Onerilen aci: ${claudeAnalysis.recommended_angles ? claudeAnalysis.recommended_angles.length : 0}`);
  console.log(`Sonuc: ${outputPath}`);

  return result;
}

// ==================== CLI ====================

if (require.main === module) {
  const sectorArg = process.argv.find(a => a.startsWith('--sector='));
  const sector = sectorArg ? sectorArg.split('=')[1] : null;

  trendAnalysis({ sector }).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = trendAnalysis;
