const fs = require('fs');
const path = require('path');
const { fetchData } = require('./01-fetch-data');

const thresholds = require(path.join(__dirname, '..', 'config', 'thresholds.json'));
const benchmarks = require(path.join(__dirname, '..', 'config', 'benchmarks.json'));

const PATTERN_KEYWORDS = {
  'aciliyet_vurgusu': ['son', 'kacirma', 'sinirli', 'hemen', 'acele', 'son 24', 'son 3', 'son 5'],
  'fiyat_odakli': ['indirim', 'fiyat', 'uygun', 'ucret', 'kargo', 'tasfiye', '%'],
  'sosyal_kanit': ['en cok', 'binlerce', 'populer', 'trend', 'herkes'],
  'kisisellik': ['sana ozel', 'senin', 'tarzin', 'kendi', 'benim'],
  'guven_vurgusu': ['iade', 'garanti', 'kalite', 'premium', 'risksiz'],
  'odul_tesvik': ['odul', 'puan', 'kazan', 'yarisma', 'hediye']
};

function detectPatterns(headline, description) {
  const text = `${headline} ${description}`.toLowerCase();
  const found = [];

  for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.push(pattern);
    }
  }

  return found;
}

function classifyAd(ad) {
  const { ctr, cpa, roas, spend, conversions } = ad;
  const { target_cpa, low_performance: low, high_performance: high } = thresholds;

  const reasons = [];

  // Düşük performans kontrolleri
  if (ctr < low.ctr_below) reasons.push(`CTR %${ctr.toFixed(2)} — esik %${low.ctr_below} altinda`);
  if (cpa > target_cpa * low.cpa_multiplier && conversions > 0) reasons.push(`CPA $${cpa.toFixed(2)} — hedefin ${low.cpa_multiplier}x uzerinde`);
  if (roas < low.roas_below && roas > 0) reasons.push(`ROAS ${roas.toFixed(2)} — esik ${low.roas_below} altinda`);
  if (spend > low.zero_conversion_min_spend && conversions === 0) reasons.push(`$${spend.toFixed(2)} harcama, 0 donusum`);

  if (reasons.length > 0) {
    return { category: 'low', reasons };
  }

  // Yüksek performans kontrolleri
  const highMarks = [];
  if (ctr > high.ctr_above) highMarks.push('yuksek_ctr');
  if (roas > high.roas_above) highMarks.push('yuksek_roas');
  if (cpa < target_cpa * high.cpa_ratio && conversions > 0) highMarks.push('dusuk_cpa');

  if (highMarks.length >= 2) {
    return { category: 'top', highMarks };
  }

  return { category: 'neutral' };
}

function getRecommendation(reasons) {
  if (reasons.some(r => r.includes('0 donusum'))) return 'Durdur';
  if (reasons.some(r => r.includes('uzerinde')) && reasons.some(r => r.includes('altinda'))) return 'Durdur';
  return 'Butce azalt veya kreatifi degistir';
}

// Ters metrikler: dusuk = iyi (CPC, CPA)
const INVERSE_METRICS = ['cpc', 'cpa'];

const METRIC_LABELS = {
  ctr: 'CTR',
  cpc: 'CPC',
  cpa: 'CPA',
  roas: 'ROAS',
  conversion_rate: 'Donusum Orani'
};

function calculateBenchmark(ads, sectorKey) {
  const sectorBench = benchmarks[sectorKey];
  if (!sectorBench) return null;

  // Musteri ortalamalarini hesapla
  const count = ads.length;
  if (count === 0) return null;

  const sums = { ctr: 0, cpc: 0, cpa: 0, roas: 0, conversion_rate: 0 };
  for (const ad of ads) {
    sums.ctr += ad.ctr || 0;
    sums.cpc += ad.cpc || 0;
    sums.cpa += ad.cpa || 0;
    sums.roas += ad.roas || 0;
    sums.conversion_rate += ad.conversion_rate || 0;
  }

  const clientAvg = {
    ctr: sums.ctr / count,
    cpc: sums.cpc / count,
    cpa: sums.cpa / count,
    roas: sums.roas / count,
    conversion_rate: sums.conversion_rate / count
  };

  const metrics = {};
  const strengths = [];
  const weaknesses = [];
  let totalScore = 0;

  for (const key of Object.keys(clientAvg)) {
    const client = clientAvg[key];
    const sectorAvg = sectorBench[`avg_${key}`];
    const diffPct = sectorAvg !== 0 ? ((client - sectorAvg) / sectorAvg) * 100 : 0;
    const isInverse = INVERSE_METRICS.includes(key);

    // Performans durumu: ters metriklerde dusuk = iyi
    let status;
    if (isInverse) {
      status = diffPct < -10 ? 'above' : diffPct > 10 ? 'below' : 'average';
    } else {
      status = diffPct > 10 ? 'above' : diffPct < -10 ? 'below' : 'average';
    }

    metrics[key] = {
      client: Math.round(client * 100) / 100,
      sector_avg: sectorAvg,
      diff_pct: Math.round(diffPct * 10) / 10,
      status
    };

    // Skor: above=20, average=12, below=0
    if (status === 'above') totalScore += 20;
    else if (status === 'average') totalScore += 12;

    const label = METRIC_LABELS[key];
    const absDiff = Math.abs(Math.round(diffPct * 10) / 10);

    if (status === 'above') {
      if (isInverse) {
        strengths.push(`${label} sektor ortalamasinin %${absDiff} altinda (iyi)`);
      } else {
        strengths.push(`${label} sektor ortalamasinin %${absDiff} uzerinde`);
      }
    } else if (status === 'below') {
      if (isInverse) {
        weaknesses.push(`${label} sektor ortalamasinin %${absDiff} uzerinde (kotu)`);
      } else {
        weaknesses.push(`${label} sektor ortalamasinin %${absDiff} altinda`);
      }
    }
  }

  // Oneriler
  const recommendations = [];
  for (const [key, m] of Object.entries(metrics)) {
    if (m.status === 'below') {
      const label = METRIC_LABELS[key];
      if (key === 'ctr') recommendations.push(`${label} dusuk — kreatif ve hedefleme optimizasyonu yapilmali`);
      else if (key === 'cpc') recommendations.push(`${label} yuksek — teklif stratejisi ve hedefleme daraltilmali`);
      else if (key === 'cpa') recommendations.push(`${label} yuksek — donusum hunisi ve landing page optimize edilmeli`);
      else if (key === 'roas') recommendations.push(`${label} dusuk — yuksek performansli reklamlara butce kaydirmali`);
      else if (key === 'conversion_rate') recommendations.push(`${label} dusuk — CTA ve teklif guclendirilmeli`);
    }
  }

  return {
    sector: sectorKey,
    overall_score: totalScore,
    metrics,
    strengths,
    weaknesses,
    recommendations
  };
}

async function analyze(fileNameOrData, options) {
  const opts = options || {};
  const sector = opts.sector || null;
  const data = Array.isArray(fileNameOrData) ? fileNameOrData : await fetchData(fileNameOrData);

  const lowPerformers = [];
  const topPerformers = [];
  const neutralAds = [];

  for (const ad of data) {
    const result = classifyAd(ad);

    if (result.category === 'low') {
      lowPerformers.push({
        ad_name: ad.ad_name,
        headline: ad.headline,
        metrics: {
          impressions: ad.impressions,
          clicks: ad.clicks,
          ctr: ad.ctr,
          cpa: ad.cpa,
          roas: ad.roas,
          spend: ad.spend,
          conversions: ad.conversions
        },
        reason: result.reasons.join('; '),
        recommendation: getRecommendation(result.reasons)
      });
    } else if (result.category === 'top') {
      topPerformers.push({
        ad_name: ad.ad_name,
        headline: ad.headline,
        description: ad.description,
        metrics: {
          impressions: ad.impressions,
          clicks: ad.clicks,
          ctr: ad.ctr,
          cpa: ad.cpa,
          roas: ad.roas,
          spend: ad.spend,
          conversions: ad.conversions
        },
        success_patterns: detectPatterns(ad.headline, ad.description)
      });
    } else {
      neutralAds.push(ad.ad_name);
    }
  }

  // Benchmark karsilastirmasi
  const benchmarkComparison = sector ? calculateBenchmark(data, sector) : null;

  const analysisResult = {
    analysis_date: new Date().toISOString().split('T')[0],
    total_ads_analyzed: data.length,
    low_performers: lowPerformers,
    top_performers: topPerformers,
    summary: {
      low_count: lowPerformers.length,
      top_count: topPerformers.length,
      neutral_count: neutralAds.length
    },
    benchmark_comparison: benchmarkComparison
  };

  // Dosyaya yaz
  const today = new Date().toISOString().split('T')[0];
  const outputPath = path.join(__dirname, '..', 'data', 'analysis', `analysis-${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf-8');

  return { analysisResult, outputPath };
}

// CLI modunda çalıştırılırsa
if (require.main === module) {
  const fileName = process.argv[2] || 'sample-ads.csv';
  const sectorArg = process.argv.find(a => a.startsWith('--sector='));
  const sector = sectorArg ? sectorArg.split('=')[1] : null;

  console.log(`Analiz basliyor: ${fileName}`);
  if (sector) console.log(`Sektor: ${sector}`);
  console.log('');

  analyze(fileName, { sector })
    .then(({ analysisResult, outputPath }) => {
      console.log('=== ANALIZ SONUCU ===\n');
      console.log(`Toplam reklam: ${analysisResult.total_ads_analyzed}`);
      console.log(`Dusuk performans: ${analysisResult.summary.low_count}`);
      console.log(`Yuksek performans: ${analysisResult.summary.top_count}`);
      console.log(`Notr: ${analysisResult.summary.neutral_count}`);

      console.log('\n--- DUSUK PERFORMANSLILAR ---');
      for (const ad of analysisResult.low_performers) {
        console.log(`  ${ad.ad_name}: ${ad.reason} → ${ad.recommendation}`);
      }

      console.log('\n--- YUKSEK PERFORMANSLILAR ---');
      for (const ad of analysisResult.top_performers) {
        console.log(`  ${ad.ad_name}: "${ad.headline}" | Patternlar: ${ad.success_patterns.join(', ')}`);
      }

      if (analysisResult.benchmark_comparison) {
        const bc = analysisResult.benchmark_comparison;
        console.log(`\n--- SEKTOR BENCHMARK (${bc.sector}) ---`);
        console.log(`  Genel skor: ${bc.overall_score}/100`);
        for (const [key, m] of Object.entries(bc.metrics)) {
          const icon = m.status === 'above' ? '+' : m.status === 'below' ? '-' : '=';
          console.log(`  [${icon}] ${METRIC_LABELS[key]}: ${m.client} (sektor: ${m.sector_avg}, fark: %${m.diff_pct})`);
        }
        if (bc.strengths.length > 0) {
          console.log('  Guclu yonler:');
          for (const s of bc.strengths) console.log(`    + ${s}`);
        }
        if (bc.weaknesses.length > 0) {
          console.log('  Zayif yonler:');
          for (const w of bc.weaknesses) console.log(`    - ${w}`);
        }
        if (bc.recommendations.length > 0) {
          console.log('  Oneriler:');
          for (const r of bc.recommendations) console.log(`    > ${r}`);
        }
      }

      console.log(`\nSonuc yazildi: ${outputPath}`);
    })
    .catch((err) => {
      console.error('Hata:', err.message);
      process.exit(1);
    });
}

module.exports = analyze;
