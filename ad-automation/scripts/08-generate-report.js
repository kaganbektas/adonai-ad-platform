require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const puppeteer = require('puppeteer');

const claudeConfig = require(path.join(__dirname, '..', 'config', 'claude-config.json'));
const sectorsConfig = require(path.join(__dirname, '..', 'config', 'sectors.json'));

// ==================== VERI TOPLAMA ====================

function getLatestFile(dir, prefix) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length > 0 ? path.join(dir, files[0]) : null;
}

function safeReadJSON(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function findRenderedImages(date, maxImages) {
  const outputDir = path.join(__dirname, '..', 'data', 'output', date);
  if (!fs.existsSync(outputDir)) return [];

  const templates = fs.readdirSync(outputDir).filter(f => {
    const p = path.join(outputDir, f);
    return fs.statSync(p).isDirectory() && f !== 'report.json';
  });

  // Her template'den 1'er gorsel sec (karisik gosterim)
  const picked = [];
  let round = 0;

  while (picked.length < maxImages) {
    let foundAny = false;
    for (const template of templates) {
      if (picked.length >= maxImages) break;
      const templateDir = path.join(outputDir, template);
      const sizes = fs.readdirSync(templateDir).filter(f =>
        fs.statSync(path.join(templateDir, f)).isDirectory()
      );

      for (const size of sizes) {
        const sizeDir = path.join(templateDir, size);
        const pngs = fs.readdirSync(sizeDir).filter(f => f.endsWith('.png')).sort();
        if (round < pngs.length) {
          const imgPath = path.join(sizeDir, pngs[round]);
          const base64 = fs.readFileSync(imgPath).toString('base64');
          picked.push({
            template,
            size,
            fileName: pngs[round],
            base64: `data:image/png;base64,${base64}`
          });
          foundAny = true;
        }
        break; // ilk size yeterli
      }
    }
    if (!foundAny) break;
    round++;
  }

  return picked.slice(0, maxImages);
}

function collectReportData(options) {
  const { sector, client, date } = options;
  const analysisDir = path.join(__dirname, '..', 'data', 'analysis');
  const copyDir = path.join(__dirname, '..', 'data', 'copy');

  const analysis = safeReadJSON(getLatestFile(analysisDir, 'analysis-'));
  const competitor = safeReadJSON(getLatestFile(analysisDir, 'competitor-'));
  const trends = safeReadJSON(getLatestFile(analysisDir, 'trends-'));
  const copy = safeReadJSON(getLatestFile(copyDir, 'copy-'));
  const images = findRenderedImages(date, 6);

  return { analysis, competitor, trends, copy, images, sector, client, date };
}

// ==================== CLAUDE AKSIYON PLANI ====================

async function generateActionPlan(reportData) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    return null;
  }

  const client = new Anthropic();

  let summary = '';

  if (reportData.analysis) {
    const a = reportData.analysis;
    summary += `Toplam reklam: ${a.total_ads_analyzed}, Düşük performanslı: ${a.summary.low_count}, Yüksek performanslı: ${a.summary.top_count}\n`;

    if (a.benchmark_comparison) {
      const bc = a.benchmark_comparison;
      summary += `\nBenchmark skor: ${bc.overall_score}/100\n`;
      summary += `Güçlü yönler: ${bc.strengths.join('; ')}\n`;
      summary += `Zayıf yönler: ${bc.weaknesses.join('; ')}\n`;
      summary += `Öneriler: ${bc.recommendations.join('; ')}\n`;
    }
  }

  if (reportData.trends && reportData.trends.claude_analysis) {
    const t = reportData.trends.claude_analysis;
    if (t.top_trends) {
      summary += `\nTrendler: ${t.top_trends.map(tr => tr.trend).join(', ')}\n`;
    }
    if (t.recommended_angles) {
      summary += `Önerilen açılar: ${t.recommended_angles.map(a => a.angle).join(', ')}\n`;
    }
  }

  if (reportData.competitor && reportData.competitor.claude_analysis) {
    const c = reportData.competitor.claude_analysis;
    if (c.differentiation_opportunities) {
      summary += `\nFarklılaşma fırsatları: ${c.differentiation_opportunities.join('; ')}\n`;
    }
  }

  if (!summary.trim()) return null;

  const prompt = `Aşağıda bir dijital reklam hesabının analiz özeti var. Bu verilere dayanarak öncelikli bir haftalık aksiyon planı oluştur.

${summary}

5-7 maddelik aksiyon planını SADECE aşağıdaki JSON formatında ver:
[
  { "priority": "yuksek", "action": "...", "expected_impact": "..." },
  { "priority": "orta", "action": "...", "expected_impact": "..." }
]

priority değerleri: "yuksek", "orta", "dusuk"`;

  const message = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: claudeConfig.max_tokens,
    messages: [{ role: 'user', content: prompt }],
    system: 'Sen deneyimli bir dijital pazarlama stratejistisin. Türkçe yaz. Türkçe karakterleri doğru kullan. SADECE istenilen JSON formatını döndür.'
  });

  const responseText = message.content[0].text.trim();

  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  }
}

// ==================== HTML URETIMI ====================

function getStatusColor(status) {
  if (status === 'above') return '#4caf50';
  if (status === 'below') return '#f44336';
  return '#ff9800';
}

function getStatusLabel(status) {
  if (status === 'above') return 'İyi';
  if (status === 'below') return 'Düşük';
  return 'Ortalama';
}

function getPriorityColor(priority) {
  if (priority === 'yuksek') return '#f44336';
  if (priority === 'orta') return '#ff9800';
  return '#4caf50';
}

function getPriorityIcon(priority) {
  if (priority === 'yuksek') return '🔴';
  if (priority === 'orta') return '🟡';
  return '🟢';
}

function getFrequencyBadge(freq) {
  const colors = { yuksek: '#f44336', orta: '#ff9800', dusuk: '#4caf50' };
  const color = colors[freq] || '#9e9e9e';
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${color};color:#fff;font-size:12px;font-weight:600;">${freq}</span>`;
}

function getImpactBarWidth(impact) {
  if (impact === 'yuksek') return 90;
  if (impact === 'orta') return 60;
  return 30;
}

function buildHTML(reportData, actionPlan, options) {
  const { sector, client, date } = options;
  const sectorInfo = sector && sectorsConfig[sector] ? sectorsConfig[sector] : null;

  // Sektör renkleri
  const gradientBg = sectorInfo ? sectorInfo.styles.gradient.bg_color : '#1a1a2e';
  const accentColor = sectorInfo ? sectorInfo.styles.gradient.accent_color : '#e94560';
  const sectorLabel = sectorInfo ? sectorInfo.label : (sector || '');

  const analysis = reportData.analysis;
  const benchmark = analysis ? analysis.benchmark_comparison : null;
  const competitor = reportData.competitor;
  const trends = reportData.trends;
  const images = reportData.images;

  // Skor daire
  let scoreColor = '#9e9e9e';
  let scoreValue = 0;
  if (benchmark) {
    scoreValue = benchmark.overall_score;
    if (benchmark.overall_score >= 70) scoreColor = '#4caf50';
    else if (benchmark.overall_score >= 40) scoreColor = '#ff9800';
    else scoreColor = '#f44336';
  }

  const scoreDeg = Math.round((scoreValue / 100) * 360);

  // ---- HTML ----
  let html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reklam Performans Raporu${client ? ' — ' + client : ''}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');

:root {
  --accent: ${accentColor};
  --accent-light: ${accentColor}22;
  --accent-mid: ${accentColor}55;
  --bg-dark: ${gradientBg};
  --green: #4caf50;
  --yellow: #ff9800;
  --red: #f44336;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, sans-serif; background: var(--gray-50); color: var(--gray-900); line-height: 1.6; }

.container { max-width: 900px; margin: 0 auto; padding: 0 24px; }

/* HEADER */
.header {
  background: linear-gradient(135deg, var(--bg-dark) 0%, ${gradientBg}dd 50%, var(--accent) 100%);
  color: #fff;
  padding: 52px 0 44px;
  position: relative;
  overflow: hidden;
}
.header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
  border-radius: 50%;
}
.header::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
  border-radius: 50%;
}
.header-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
.header-left h1 { font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
.header-left .subtitle { opacity: 0.85; font-size: 14px; }
.header-left .meta-info { margin-top: 14px; display: flex; gap: 20px; font-size: 13px; opacity: 0.75; }
.header-left .meta-info span { display: flex; align-items: center; gap: 6px; }

/* SCORE RING */
.score-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(${scoreColor} 0deg, ${scoreColor} ${scoreDeg}deg, rgba(255,255,255,0.15) ${scoreDeg}deg, rgba(255,255,255,0.15) 360deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.score-ring-inner {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg-dark), ${gradientBg}ee);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.score-ring-inner .score-value { font-family: 'Poppins', sans-serif; font-size: 34px; font-weight: 800; line-height: 1; }
.score-ring-inner .score-label { font-size: 10px; opacity: 0.7; margin-top: 2px; letter-spacing: 1px; }

/* DIVIDER */
.section-divider { height: 1px; background: linear-gradient(to right, transparent, var(--gray-200), transparent); margin: 40px 0; }

/* SECTIONS */
.section { margin: 40px 0; }
.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 3px solid var(--accent);
  display: inline-block;
}

/* CARDS */
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 24px;
  margin-bottom: 16px;
}
.card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

/* STAT CARDS */
.stat-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.stat-card .stat-icon { font-size: 24px; margin-bottom: 8px; }
.stat-card .stat-value { font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 700; color: var(--accent); }
.stat-card .stat-label { font-size: 13px; color: var(--gray-500); margin-top: 4px; }

/* TABLE */
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--gray-100); font-size: 14px; }
th { font-weight: 600; color: var(--gray-500); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; background: var(--gray-50); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--gray-50); }

/* BAR CHART */
.bar-row { display: flex; align-items: center; margin-bottom: 16px; }
.bar-label { width: 110px; font-size: 13px; font-weight: 600; color: var(--gray-700); flex-shrink: 0; }
.bar-group { flex: 1; }
.bar-track { height: 24px; background: var(--gray-100); border-radius: 12px; position: relative; overflow: hidden; margin-bottom: 4px; }
.bar-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; padding: 0 10px; font-size: 11px; font-weight: 600; color: #fff; min-width: 36px; transition: width 0.3s; }
.bar-legend { font-size: 11px; color: var(--gray-500); display: flex; gap: 12px; }
.bar-value { margin-left: 12px; font-size: 13px; font-weight: 600; width: 72px; flex-shrink: 0; text-align: right; }

/* BADGE */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.badge-green { background: #e8f5e9; color: #2e7d32; }
.badge-yellow { background: #fff3e0; color: #e65100; }
.badge-red { background: #fbe9e7; color: #c62828; }

/* ACTION ITEM */
.action-item {
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 12px;
  border-left: 4px solid;
  align-items: flex-start;
}
.action-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.action-content { flex: 1; }
.action-content .action-text { font-size: 14px; font-weight: 600; color: var(--gray-900); }
.action-content .action-impact { font-size: 13px; color: var(--gray-500); margin-top: 4px; font-style: italic; }

/* AD PERFORMER */
.performer-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 18px 20px;
  margin-bottom: 12px;
  border-left: 4px solid var(--green);
}
.performer-card .headline { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.performer-card .metrics { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--gray-500); }
.performer-card .metrics span { display: inline-flex; align-items: center; gap: 4px; }
.performer-card .patterns { margin-top: 10px; }
.performer-card .pattern-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  margin-right: 6px;
  margin-top: 4px;
}

/* IMAGES GRID */
.images-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.image-card { text-align: center; }
.image-card img { width: 100%; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.image-card .image-label { font-size: 12px; color: var(--gray-500); margin-top: 8px; font-weight: 500; }

/* TRIGGER CARD */
.trigger-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 16px 18px;
}
.trigger-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.trigger-name { font-weight: 700; font-size: 14px; }
.trigger-usage { font-size: 13px; color: var(--gray-500); margin-bottom: 10px; }
.impact-bar { height: 6px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
.impact-fill { height: 100%; border-radius: 3px; }

/* PIE CHART (CSS conic-gradient) */
.pie-chart {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pie-legend { font-size: 12px; color: var(--gray-500); }
.pie-legend span { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.pie-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* COMPETITOR CARD */
.competitor-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 20px;
  margin-bottom: 12px;
}
.competitor-card h4 { font-family: 'Poppins', sans-serif; margin-bottom: 10px; }
.competitor-stats { display: flex; gap: 24px; font-size: 13px; color: var(--gray-500); margin-bottom: 10px; }

/* FOOTER */
.footer { text-align: center; padding: 36px 0; color: var(--gray-500); font-size: 12px; border-top: 1px solid var(--gray-200); margin-top: 48px; }

/* RESPONSIVE */
@media (max-width: 640px) {
  .header-content { flex-direction: column; text-align: center; gap: 20px; }
  .header-left .meta-info { justify-content: center; flex-wrap: wrap; }
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .images-grid { grid-template-columns: repeat(2, 1fr); }
}

/* PRINT */
@media print {
  body { background: #fff; }
  .card, .stat-card, .performer-card, .action-item, .trigger-card, .competitor-card { box-shadow: 0 1px 3px rgba(0,0,0,0.1); break-inside: avoid; }
  .section { break-inside: avoid; }
}
</style>
</head>
<body>`;

  // ---- HEADER ----
  html += `
<div class="header">
  <div class="container">
    <div class="header-content">
      <div class="header-left">
        <h1>Reklam Performans Raporu</h1>
        <div class="subtitle">${client ? client + ' — ' : ''}Haftalık Analiz Özeti</div>
        <div class="meta-info">
          <span>📅 ${date}</span>
          ${sectorLabel ? `<span>🏷️ ${sectorLabel}</span>` : ''}
          ${analysis ? `<span>📊 ${analysis.total_ads_analyzed} reklam</span>` : ''}
        </div>
      </div>
      ${benchmark ? `
      <div class="score-ring">
        <div class="score-ring-inner">
          <div class="score-value">${scoreValue}</div>
          <div class="score-label">SKOR</div>
        </div>
      </div>` : ''}
    </div>
  </div>
</div>`;

  html += `<div class="container">`;

  // ---- YÖNETİCİ ÖZETİ ----
  if (analysis) {
    html += `
<div class="section">
  <div class="section-title">Yönetici Özeti</div>
  <div class="card-grid">
    <div class="stat-card" style="border-top:3px solid var(--accent)">
      <div class="stat-icon">📊</div>
      <div class="stat-value">${analysis.total_ads_analyzed}</div>
      <div class="stat-label">Toplam Reklam</div>
    </div>
    <div class="stat-card" style="border-top:3px solid var(--green)">
      <div class="stat-icon">✅</div>
      <div class="stat-value" style="color:var(--green)">${analysis.summary.top_count}</div>
      <div class="stat-label">Yüksek Performans</div>
    </div>
    <div class="stat-card" style="border-top:3px solid var(--red)">
      <div class="stat-icon">❌</div>
      <div class="stat-value" style="color:var(--red)">${analysis.summary.low_count}</div>
      <div class="stat-label">Düşük Performans</div>
    </div>
    <div class="stat-card" style="border-top:3px solid ${scoreColor}">
      <div class="stat-icon">🎯</div>
      <div class="stat-value" style="color:${scoreColor}">${benchmark ? benchmark.overall_score + '/100' : '-'}</div>
      <div class="stat-label">Benchmark Skor</div>
    </div>
  </div>`;

    if (benchmark && benchmark.weaknesses.length > 0) {
      html += `<div class="card" style="margin-top:16px;border-left:4px solid var(--yellow)">
    <strong>⚠️ Kritik Bulgular:</strong>
    <ul style="margin-top:8px;padding-left:20px;color:var(--gray-700);font-size:14px;">`;
      for (const w of benchmark.weaknesses.slice(0, 3)) {
        html += `<li>${w}</li>`;
      }
      html += `</ul></div>`;
    }

    html += `</div>`;
  }

  html += `<div class="section-divider"></div>`;

  // ---- PERFORMANS ANALİZİ ----
  if (analysis) {
    html += `
<div class="section">
  <div class="section-title">Performans Analizi</div>`;

    // Top performers
    if (analysis.top_performers.length > 0) {
      html += `<h3 style="font-size:16px;margin-bottom:12px;color:var(--green)">✅ Yüksek Performanslı Reklamlar</h3>`;
      for (const ad of analysis.top_performers.slice(0, 5)) {
        html += `
  <div class="performer-card">
    <div class="headline">"${escapeHTML(ad.headline)}"</div>
    <div class="metrics">
      <span>📈 CTR <strong>%${ad.metrics.ctr}</strong></span>
      <span>💰 ROAS <strong>${ad.metrics.roas}</strong></span>
      <span>🏷️ CPA <strong>$${ad.metrics.cpa}</strong></span>
      <span>💵 Harcama <strong>$${ad.metrics.spend}</strong></span>
    </div>
    ${ad.success_patterns.length > 0 ? `<div class="patterns">${ad.success_patterns.map(p => `<span class="pattern-tag">${p}</span>`).join('')}</div>` : ''}
  </div>`;
      }
    }

    // Low performers
    if (analysis.low_performers.length > 0) {
      html += `<h3 style="font-size:16px;margin:24px 0 12px;color:var(--red)">❌ Düşük Performanslı Reklamlar</h3>`;
      html += `<div class="card" style="padding:0;overflow:hidden;"><table>
        <tr><th>Reklam</th><th>CTR</th><th>CPA</th><th>ROAS</th><th>Öneri</th></tr>`;
      for (const ad of analysis.low_performers.slice(0, 5)) {
        html += `<tr>
          <td><strong>${escapeHTML(ad.ad_name)}</strong></td>
          <td>%${ad.metrics.ctr}</td>
          <td>$${ad.metrics.cpa}</td>
          <td>${ad.metrics.roas}</td>
          <td><span class="badge badge-red">${ad.recommendation}</span></td>
        </tr>`;
      }
      html += `</table></div>`;
    }

    html += `</div>`;
  }

  html += `<div class="section-divider"></div>`;

  // ---- SEKTÖR KARŞILAŞTIRMASI ----
  if (benchmark) {
    html += `
<div class="section">
  <div class="section-title">Sektör Karşılaştırması</div>
  <div class="card">
    <div style="display:flex;justify-content:flex-end;gap:16px;margin-bottom:16px;font-size:12px;color:var(--gray-500);">
      <span>🔵 Müşteri</span>
      <span>⚪ Sektör Ortalaması</span>
    </div>`;

    const metricLabels = { ctr: 'CTR', cpc: 'CPC', cpa: 'CPA', roas: 'ROAS', conversion_rate: 'Dönüşüm' };

    for (const [key, m] of Object.entries(benchmark.metrics)) {
      const label = metricLabels[key] || key;
      const color = getStatusColor(m.status);
      const maxVal = Math.max(m.client, m.sector_avg) * 1.3 || 1;
      const clientPct = Math.min((m.client / maxVal) * 100, 100);
      const sectorPct = Math.min((m.sector_avg / maxVal) * 100, 100);

      html += `
    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-group">
        <div class="bar-track"><div class="bar-fill" style="width:${clientPct}%;background:${color}">${m.client}</div></div>
        <div class="bar-track" style="height:16px;margin-top:2px"><div class="bar-fill" style="width:${sectorPct}%;background:var(--gray-300);color:var(--gray-700);font-size:10px;height:100%">${m.sector_avg}</div></div>
      </div>
      <div class="bar-value"><span class="badge ${m.status === 'above' ? 'badge-green' : m.status === 'below' ? 'badge-red' : 'badge-yellow'}">${getStatusLabel(m.status)}</span></div>
    </div>`;
    }

    html += `</div>`;

    // Güçlü / Zayıf
    if (benchmark.strengths.length > 0 || benchmark.weaknesses.length > 0) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
      if (benchmark.strengths.length > 0) {
        html += `<div class="card"><h4 style="color:var(--green);margin-bottom:10px;">💪 Güçlü Yönler</h4><ul style="padding-left:20px;font-size:14px;color:var(--gray-700);">`;
        for (const s of benchmark.strengths) html += `<li style="margin-bottom:4px">${s}</li>`;
        html += `</ul></div>`;
      }
      if (benchmark.weaknesses.length > 0) {
        html += `<div class="card"><h4 style="color:var(--red);margin-bottom:10px;">⚠️ Zayıf Yönler</h4><ul style="padding-left:20px;font-size:14px;color:var(--gray-700);">`;
        for (const w of benchmark.weaknesses) html += `<li style="margin-bottom:4px">${w}</li>`;
        html += `</ul></div>`;
      }
      html += `</div>`;
    }

    if (benchmark.recommendations.length > 0) {
      html += `<div class="card" style="border-left:4px solid var(--accent)"><h4 style="margin-bottom:10px;">💡 Öneriler</h4><ul style="padding-left:20px;font-size:14px;color:var(--gray-700);">`;
      for (const r of benchmark.recommendations) html += `<li style="margin-bottom:4px">${r}</li>`;
      html += `</ul></div>`;
    }

    html += `</div>`;
  }

  html += `<div class="section-divider"></div>`;

  // ---- RAKİP ANALİZİ ----
  if (competitor && competitor.competitor_details) {
    html += `
<div class="section">
  <div class="section-title">Rakip Analizi</div>`;

    for (const [name, data] of Object.entries(competitor.competitor_details)) {
      // Platform dağılımı pie chart
      let pieHTML = '';
      if (data.platform_distribution && Object.keys(data.platform_distribution).length > 0) {
        const total = Object.values(data.platform_distribution).reduce((s, v) => s + v, 0);
        const platformColors = { facebook: '#1877F2', instagram: '#E4405F', audience_network: '#8B5CF6', messenger: '#0084FF' };
        let cumDeg = 0;
        const segments = [];
        const legendItems = [];
        for (const [p, count] of Object.entries(data.platform_distribution)) {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const deg = Math.round((pct / 100) * 360);
          const color = platformColors[p] || '#9e9e9e';
          segments.push(`${color} ${cumDeg}deg ${cumDeg + deg}deg`);
          cumDeg += deg;
          legendItems.push(`<span><span class="pie-dot" style="background:${color}"></span>${p}: ${count} (%${Math.round(pct)})</span>`);
        }

        pieHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-top:10px">
          <div class="pie-chart" style="background:conic-gradient(${segments.join(', ')})"></div>
          <div class="pie-legend">${legendItems.join('')}</div>
        </div>`;
      }

      html += `
  <div class="competitor-card">
    <h4>🏢 ${escapeHTML(name)}</h4>
    <div class="competitor-stats">
      <span>Toplam: <strong>${data.total_ads}</strong></span>
      <span>Aktif: <strong>${data.active_ads}</strong></span>
      <span>Ort. yayında: <strong>${data.avg_days_active} gün</strong></span>
    </div>
    ${pieHTML}
  </div>`;
    }

    if (competitor.claude_analysis) {
      const ca = competitor.claude_analysis;

      if (ca.common_patterns && ca.common_patterns.length > 0) {
        html += `<div class="card"><h4 style="margin-bottom:10px;">🔍 Ortak Patternler</h4><ul style="padding-left:20px;font-size:14px;color:var(--gray-700);">`;
        for (const p of ca.common_patterns) html += `<li style="margin-bottom:4px">${escapeHTML(p)}</li>`;
        html += `</ul></div>`;
      }

      if (ca.differentiation_opportunities && ca.differentiation_opportunities.length > 0) {
        html += `<div class="card" style="border-left:4px solid var(--green)"><h4 style="color:var(--green);margin-bottom:10px;">🚀 Farklılaşma Fırsatları</h4><ul style="padding-left:20px;font-size:14px;color:var(--gray-700);">`;
        for (const d of ca.differentiation_opportunities) html += `<li style="margin-bottom:4px">${escapeHTML(d)}</li>`;
        html += `</ul></div>`;
      }

      if (ca.tone_analysis) {
        html += `<div class="card"><h4 style="margin-bottom:14px;">🎨 Ton Analizi</h4>`;
        for (const [tone, pct] of Object.entries(ca.tone_analysis)) {
          html += `<div class="bar-row">
            <div class="bar-label">${tone}</div>
            <div class="bar-group"><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--accent)">${pct}%</div></div></div>
          </div>`;
        }
        html += `</div>`;
      }
    }

    html += `</div>`;
    html += `<div class="section-divider"></div>`;
  }

  // ---- TREND & FIRSATLAR ----
  if (trends && trends.claude_analysis) {
    const ta = trends.claude_analysis;
    html += `
<div class="section">
  <div class="section-title">Trend &amp; Fırsatlar</div>`;

    // Top Trends
    if (ta.top_trends && ta.top_trends.length > 0) {
      html += `<div class="card" style="padding:0;overflow:hidden;"><table>
        <tr><th>📈 Trend</th><th>Sıklık</th><th>Örnek</th></tr>`;
      for (const t of ta.top_trends) {
        html += `<tr>
          <td><strong>${escapeHTML(t.trend)}</strong></td>
          <td>${getFrequencyBadge(t.frequency)}</td>
          <td style="font-size:13px;color:var(--gray-500)">${escapeHTML(t.example)}</td>
        </tr>`;
      }
      html += `</table></div>`;
    }

    // Emotional Triggers with impact bars
    if (ta.emotional_triggers && ta.emotional_triggers.length > 0) {
      html += `<h3 style="font-size:16px;margin:24px 0 14px">🧠 Duygusal Tetikleyiciler</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">`;
      for (const et of ta.emotional_triggers) {
        const barWidth = getImpactBarWidth(et.impact);
        const barColor = et.impact === 'yuksek' ? 'var(--red)' : et.impact === 'orta' ? 'var(--yellow)' : 'var(--green)';
        html += `<div class="trigger-card">
          <div class="trigger-header">
            <span class="trigger-name">${escapeHTML(et.trigger)}</span>
            ${getFrequencyBadge(et.impact)}
          </div>
          <div class="trigger-usage">${escapeHTML(et.usage)}</div>
          <div class="impact-bar"><div class="impact-fill" style="width:${barWidth}%;background:${barColor}"></div></div>
        </div>`;
      }
      html += `</div>`;
    }

    // Seasonal
    if (ta.seasonal_opportunities && ta.seasonal_opportunities.length > 0) {
      html += `<h3 style="font-size:16px;margin:24px 0 14px">📅 Mevsimsel Fırsatlar</h3>`;
      for (const so of ta.seasonal_opportunities) {
        html += `<div class="card" style="border-left:4px solid var(--accent)">
          <strong>${escapeHTML(so.period)}</strong> <span class="badge badge-yellow" style="margin-left:8px">${escapeHTML(so.timing)}</span>
          <div style="font-size:14px;color:var(--gray-700);margin-top:6px">${escapeHTML(so.opportunity)}</div>
        </div>`;
      }
    }

    // Recommended Angles
    if (ta.recommended_angles && ta.recommended_angles.length > 0) {
      html += `<h3 style="font-size:16px;margin:24px 0 14px">💡 Önerilen Açılar</h3>`;
      for (const ra of ta.recommended_angles) {
        html += `<div class="card">
          <strong>🎯 ${escapeHTML(ra.angle)}</strong>
          <div style="font-size:13px;color:var(--gray-500);margin-top:6px">${escapeHTML(ra.rationale)}</div>
          <div style="margin-top:10px;padding:10px 14px;background:var(--accent-light);border-radius:10px;font-size:14px;font-weight:600;color:var(--accent);border:1px solid var(--accent-mid)">"${escapeHTML(ra.example_headline)}"</div>
        </div>`;
      }
    }

    html += `</div>`;
    html += `<div class="section-divider"></div>`;
  }

  // ---- AKSİYON PLANI ----
  if (actionPlan && actionPlan.length > 0) {
    html += `
<div class="section">
  <div class="section-title">Aksiyon Planı</div>`;
    actionPlan.forEach((item, i) => {
      const color = getPriorityColor(item.priority);
      const icon = getPriorityIcon(item.priority);
      html += `
  <div class="action-item" style="border-left-color:${color}">
    <div class="action-icon">${icon}</div>
    <div class="action-content">
      <div class="action-text">${i + 1}. ${escapeHTML(item.action)}</div>
      <div class="action-impact">↳ ${escapeHTML(item.expected_impact)}</div>
    </div>
  </div>`;
    });
    html += `</div>`;
    html += `<div class="section-divider"></div>`;
  }

  // ---- ÜRETİLEN REKLAMLAR ----
  if (images.length > 0) {
    html += `
<div class="section">
  <div class="section-title">Üretilen Reklamlar</div>
  <div class="images-grid">`;
    for (const img of images) {
      html += `
    <div class="image-card">
      <img src="${img.base64}" alt="${img.fileName}" loading="lazy">
      <div class="image-label">${img.template} / ${img.size}</div>
    </div>`;
    }
    html += `</div></div>`;
  }

  // ---- FOOTER ----
  html += `
<div class="footer">
  <p>Bu rapor otomatik olarak oluşturulmuştur. ${date}</p>
  <p style="margin-top:4px;opacity:0.7">Reklam Otomasyon Pipeline v1.1</p>
</div>
</div>
</body>
</html>`;

  return html;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== PDF RENDER ====================

async function renderPDF(htmlContent, pdfPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
  } finally {
    await browser.close();
  }
}

// ==================== ANA FONKSIYON ====================

async function generateReport(options) {
  const opts = options || {};
  const sector = opts.sector || null;
  const client = opts.client || null;
  const date = opts.date || new Date().toISOString().split('T')[0];

  console.log('Rapor verileri toplanıyor...');
  const reportData = collectReportData({ sector, client, date });

  if (!reportData.analysis) {
    throw new Error('Analiz verisi bulunamadı. Önce 02-analyze.js çalıştırın.');
  }

  console.log(`  Analiz: ${reportData.analysis.total_ads_analyzed} reklam`);
  console.log(`  Rakip: ${reportData.competitor ? 'var' : 'yok'}`);
  console.log(`  Trend: ${reportData.trends ? 'var' : 'yok'}`);
  console.log(`  Copy: ${reportData.copy ? reportData.copy.total_variations + ' varyasyon' : 'yok'}`);
  console.log(`  Görsel: ${reportData.images.length} adet`);

  // Claude aksiyon planı
  let actionPlan = null;
  console.log('\nClaude ile aksiyon planı oluşturuluyor...');
  try {
    actionPlan = await generateActionPlan(reportData);
    if (actionPlan) {
      console.log(`  ${actionPlan.length} aksiyon oluşturuldu.`);
    } else {
      console.log('  Aksiyon planı oluşturulamadı, atlanıyor.');
    }
  } catch (err) {
    console.log(`  Aksiyon planı hatası: ${err.message}`);
  }

  // HTML üret
  console.log('\nHTML rapor üretiliyor...');
  const htmlContent = buildHTML(reportData, actionPlan, { sector, client, date });

  // Dosya kaydet
  const outputDir = path.join(__dirname, '..', 'data', 'reports');
  fs.mkdirSync(outputDir, { recursive: true });

  const filePrefix = client ? `report-${client}-${date}` : `report-${date}`;
  const htmlPath = path.join(outputDir, `${filePrefix}.html`);
  const pdfPath = path.join(outputDir, `${filePrefix}.pdf`);

  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`  HTML: ${htmlPath}`);

  // PDF render
  console.log('PDF render ediliyor...');
  try {
    await renderPDF(htmlContent, pdfPath);
    console.log(`  PDF: ${pdfPath}`);
  } catch (err) {
    console.log(`  PDF render hatası: ${err.message}`);
  }

  console.log('\n=== RAPOR TAMAMLANDI ===');

  return { htmlPath, pdfPath, outputDir };
}

// ==================== CLI ====================

if (require.main === module) {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    }
  }

  generateReport({
    sector: args.sector || null,
    client: args.client || null
  }).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = generateReport;
