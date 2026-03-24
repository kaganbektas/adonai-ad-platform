require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const analyze = require('./02-analyze');
const generateCopy = require('./03-generate-copy');
const renderAds = require('./04-render-ads');
const competitorAnalysis = require('./06-competitor-analysis');
const trendAnalysis = require('./07-trend-analysis');
const generateReport = require('./08-generate-report');
const brandAnalysis = require('./09-brand-analysis');
const { fetchFromMeta } = require('./01-fetch-data');

// CLI argümanlarını parse et
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    }
  }
  return args;
}

function log(msg) {
  const ts = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${ts}] ${msg}`);
}

async function runStep(name, fn) {
  log(`ADIM BASLIYOR: ${name}`);
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    log(`ADIM TAMAMLANDI: ${name} (${(duration / 1000).toFixed(1)}s)`);
    return { name, status: 'success', duration_ms: duration, result };
  } catch (err) {
    const duration = Date.now() - start;
    log(`ADIM BASARISIZ: ${name} — ${err.message}`);
    return { name, status: 'failed', duration_ms: duration, error: err.message, result: null };
  }
}

async function runPipeline() {
  const args = parseArgs();

  const source = args.source || 'csv';

  // Parametre kontrolü
  if (source === 'csv' && !args.input) {
    console.error('Kullanim:');
    console.error('  CSV:  node scripts/run-pipeline.js --input=dosya.csv [--url=https://...] [--templates=...] [--sizes=...] [--client=...] [--images=klasor/] [--competitors="marka1,marka2"] [--report]');
    console.error('  Meta: node scripts/run-pipeline.js --source=meta [--url=https://...] [--days=30] [--start=2026-03-01 --end=2026-03-15] [--templates=...] [--sizes=...] [--images=klasor/] [--competitors="marka1,marka2"] [--report]');
    process.exit(1);
  }

  const inputFile = args.input || null;
  let client = args.client || null;
  let sector = args.sector || null;
  const templateFilter = args.templates ? args.templates.split(',') : null;
  const sizeFilter = args.sizes ? args.sizes.split(',') : null;

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     REKLAM OTOMASYON PIPELINE v1.2       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  if (source === 'meta') {
    const days = args.days ? parseInt(args.days) : 30;
    const dateInfo = args.start && args.end
      ? `${args.start} → ${args.end}`
      : `son ${days} gun`;
    log(`Kaynak: Meta Ads API (${dateInfo})`);
  } else {
    log(`Kaynak: CSV (${inputFile})`);
  }

  if (args.url) log(`Website: ${args.url}`);
  if (sector) {
    const sectorsConfig = require(path.join(__dirname, '..', 'config', 'sectors.json'));
    log(`Sektor: ${sectorsConfig[sector] ? sectorsConfig[sector].label : sector}`);
  }
  if (client) log(`Musteri: ${client}`);
  if (templateFilter) log(`Template filtresi: ${templateFilter.join(', ')}`);
  if (sizeFilter) log(`Boyut filtresi: ${sizeFilter.join(', ')}`);
  if (args.images) log(`Gorsel klasoru: ${args.images}`);
  if (args.competitors) log(`Rakipler: ${args.competitors}`);
  if (args.report) log(`Rapor uretimi: aktif`);
  console.log('');

  const pipelineStart = Date.now();
  const steps = [];
  let brandResult = null;
  let analyzeResult = null;
  let generateResult = null;
  let competitorResult = null;
  let trendResult = null;
  let renderResult = null;
  let reportResult = null;

  // Marka Analizi (--url verilmisse, ilk adim)
  if (args.url) {
    const stepB = await runStep('Marka Analizi', () => brandAnalysis({ url: args.url }));
    steps.push({ name: 'brand_analysis', status: stepB.status, duration_ms: stepB.duration_ms });
    if (stepB.status === 'success') {
      brandResult = stepB.result;
    }
    console.log('');

    // Otomatik sektor belirleme (manuel --sector oncelikli)
    if (!sector && brandResult && brandResult.claude_analysis) {
      sector = brandResult.claude_analysis.sector;
      const sectorsConfig = require(path.join(__dirname, '..', 'config', 'sectors.json'));
      log(`Sektor otomatik belirlendi: ${sectorsConfig[sector] ? sectorsConfig[sector].label : sector} (${sector})`);
    }

    // Otomatik client belirleme (manuel --client oncelikli)
    if (!client && args.url) {
      try {
        client = new URL(args.url).hostname.replace('www.', '').split('.')[0];
        log(`Musteri otomatik belirlendi: ${client}`);
      } catch {}
    }
  }

  // Otomatik rakip belirleme (brand result'tan, manuel --competitors oncelikli)
  let competitors = args.competitors ? args.competitors.split(',').map(c => c.trim()) : null;
  if (!competitors && brandResult && brandResult.claude_analysis && brandResult.claude_analysis.competitors) {
    competitors = brandResult.claude_analysis.competitors.map(c => c.name);
    log(`Rakipler otomatik belirlendi: ${competitors.join(', ')}`);
  }

  if (source === 'meta') {
    // META MODU: Önce veri çek, sonra analiz et
    let metaData = null;

    const step0 = await runStep('Meta API Veri Cekme', () => {
      const options = {};
      if (args.days) options.days = parseInt(args.days);
      if (args.start) options.startDate = args.start;
      if (args.end) options.endDate = args.end;
      return fetchFromMeta(options);
    });
    steps.push({ name: 'fetch_meta', status: step0.status, duration_ms: step0.duration_ms });

    if (step0.status === 'success') {
      metaData = step0.result;
    }
    console.log('');

    // Analiz: Meta verisini doğrudan array olarak geç
    if (metaData && metaData.length > 0) {
      const step1 = await runStep('Veri Analizi', () => analyze(metaData, { sector }));
      steps.push({ name: 'analyze', status: step1.status, duration_ms: step1.duration_ms });
      if (step1.status === 'success') {
        analyzeResult = step1.result.analysisResult;
      }
    } else {
      log('ADIM ATLANDI: Analiz — Meta API\'den veri alinamadi veya bos');
      steps.push({ name: 'analyze', status: 'skipped', duration_ms: 0 });
    }
    console.log('');

  } else {
    // CSV MODU: Mevcut akış
    const step1 = await runStep('Veri Okuma + Analiz', () => analyze(inputFile, { sector }));
    steps.push({ name: 'analyze', status: step1.status, duration_ms: step1.duration_ms });
    if (step1.status === 'success') {
      analyzeResult = step1.result.analysisResult;
    }
    console.log('');
  }

  // Rakip Analizi (manuel --competitors veya brand analizinden otomatik)
  if (competitors && competitors.length > 0) {
    const stepC = await runStep('Rakip Reklam Analizi', () => competitorAnalysis({
      competitors,
      sector: sector
    }));
    steps.push({ name: 'competitor_analysis', status: stepC.status, duration_ms: stepC.duration_ms });
    if (stepC.status === 'success') {
      competitorResult = stepC.result;
    }
  }
  console.log('');

  // Trend Analizi (top_performers varsa)
  if (analyzeResult && analyzeResult.top_performers.length > 0) {
    const stepT = await runStep('Trend Analizi', () => trendAnalysis({ sector }));
    steps.push({ name: 'trend_analysis', status: stepT.status, duration_ms: stepT.duration_ms });
    if (stepT.status === 'success') {
      trendResult = stepT.result;
    }
  } else {
    log('ADIM ATLANDI: Trend Analizi — top performer yok');
    steps.push({ name: 'trend_analysis', status: 'skipped', duration_ms: 0 });
  }
  console.log('');

  // Metin Üretimi
  if (analyzeResult && analyzeResult.top_performers.length > 0) {
    const step2 = await runStep('Claude API Metin Uretimi', () => generateCopy({ sector }));
    steps.push({ name: 'generate', status: step2.status, duration_ms: step2.duration_ms });
    if (step2.status === 'success') {
      generateResult = step2.result;
    }
  } else {
    log('ADIM ATLANDI: Metin Uretimi — analiz basarisiz veya top performer yok');
    steps.push({ name: 'generate', status: 'skipped', duration_ms: 0 });
  }
  console.log('');

  // Gorsel Render
  if (generateResult && generateResult.total_variations > 0) {
    const step3 = await runStep('HTML → PNG Render', () => renderAds({
      maxVariations: generateResult.total_variations,
      templates: templateFilter,
      sizes: sizeFilter,
      sector: sector,
      images: args.images || null
    }));
    steps.push({ name: 'render', status: step3.status, duration_ms: step3.duration_ms });
    if (step3.status === 'success') {
      renderResult = step3.result;
    }
  } else {
    log('ADIM ATLANDI: Render — metin uretimi basarisiz veya varyasyon yok');
    steps.push({ name: 'render', status: 'skipped', duration_ms: 0 });
  }

  // Rapor Uretimi (opsiyonel)
  const today = new Date().toISOString().split('T')[0];
  if (args.report) {
    const stepR = await runStep('Rapor Uretimi', () => generateReport({
      sector: sector,
      client: client,
      date: today
    }));
    steps.push({ name: 'report', status: stepR.status, duration_ms: stepR.duration_ms });
    if (stepR.status === 'success') {
      reportResult = stepR.result;
    }
  }

  const totalDuration = Date.now() - pipelineStart;
  const outputDir = renderResult
    ? renderResult.outputBase
    : path.join(__dirname, '..', 'data', 'output', today);

  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    pipeline_date: today,
    duration_seconds: Math.round(totalDuration / 1000),
    source: source,
    sector: sector,
    client: client,
    input_file: source === 'csv' ? inputFile : 'Meta Ads API',
    steps: steps,
    total_ads_analyzed: analyzeResult ? analyzeResult.total_ads_analyzed : 0,
    low_performers_found: analyzeResult ? analyzeResult.summary.low_count : 0,
    top_performers_found: analyzeResult ? analyzeResult.summary.top_count : 0,
    new_variations_generated: generateResult ? generateResult.total_variations : 0,
    images_rendered: renderResult ? renderResult.totalRendered : 0,
    images_directory: args.images || null,
    brand_analysis: brandResult ? {
      url: brandResult.url,
      detected_sector: brandResult.claude_analysis.sector,
      business_type: brandResult.claude_analysis.business_type,
      competitors_found: brandResult.claude_analysis.competitors ? brandResult.claude_analysis.competitors.length : 0
    } : null,
    benchmark_score: analyzeResult && analyzeResult.benchmark_comparison
      ? analyzeResult.benchmark_comparison.overall_score : null,
    competitor_analysis: competitorResult ? {
      competitors_analyzed: competitorResult.competitors.length,
      total_competitor_ads: competitorResult.total_ads_found
    } : null,
    trend_analysis: trendResult ? {
      trends_found: trendResult.claude_analysis.top_trends ? trendResult.claude_analysis.top_trends.length : 0,
      angles_recommended: trendResult.claude_analysis.recommended_angles ? trendResult.claude_analysis.recommended_angles.length : 0
    } : null,
    report_generated: reportResult ? true : false,
    report_path: reportResult ? reportResult.htmlPath : null,
    output_directory: outputDir
  };

  const reportPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // Özet
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║            PIPELINE OZETI                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  Kaynak:                   ${source === 'meta' ? 'Meta Ads API' : 'CSV (' + inputFile + ')'}`);
  if (brandResult) {
    const ba = brandResult.claude_analysis;
    console.log(`  Marka analizi:            ${ba.sector} sektoru, ${ba.competitors ? ba.competitors.length : 0} rakip tespit edildi`);
    console.log(`  Is turu:                  ${ba.business_type}`);
  }
  if (sector) console.log(`  Sektor:                   ${sector}`);
  console.log(`  Toplam sure:              ${report.duration_seconds}s`);
  console.log(`  Analiz edilen reklam:     ${report.total_ads_analyzed}`);
  console.log(`  Dusuk performansli:       ${report.low_performers_found}`);
  console.log(`  Yuksek performansli:      ${report.top_performers_found}`);
  console.log(`  Uretilen varyasyon:       ${report.new_variations_generated}`);
  if (analyzeResult && analyzeResult.benchmark_comparison) {
    console.log(`  Benchmark skor:           ${analyzeResult.benchmark_comparison.overall_score}/100`);
  }
  if (competitorResult) {
    console.log(`  Rakip analizi:            ${competitorResult.competitors.length} rakip, ${competitorResult.total_ads_found} reklam`);
  }
  if (trendResult) {
    const ta = trendResult.claude_analysis;
    console.log(`  Trend analizi:            ${ta.top_trends ? ta.top_trends.length : 0} trend, ${ta.recommended_angles ? ta.recommended_angles.length : 0} onerilen aci`);
  }
  console.log(`  Render edilen gorsel:     ${report.images_rendered}`);
  if (reportResult) {
    console.log(`  Rapor:                    ${reportResult.htmlPath}`);
  }
  console.log('');
  console.log('  Adim Durumlari:');
  for (const s of steps) {
    const icon = s.status === 'success' ? '+' : s.status === 'skipped' ? '-' : 'X';
    console.log(`    [${icon}] ${s.name}: ${s.status} (${(s.duration_ms / 1000).toFixed(1)}s)`);
  }
  console.log('');
  console.log(`  Rapor: ${reportPath}`);
  console.log('');

  return report;
}

if (require.main === module) {
  runPipeline().catch((err) => {
    console.error('Pipeline hatasi:', err.message);
    process.exit(1);
  });
}

module.exports = runPipeline;
