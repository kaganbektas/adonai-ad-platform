require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const metaConfig = require(path.join(__dirname, '..', 'config', 'meta-config.json'));
const claudeConfig = require(path.join(__dirname, '..', 'config', 'claude-config.json'));

// ==================== META AD LIBRARY API ====================

function getToken() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'META_ACCESS_TOKEN .env dosyasinda bulunamadi.\n' +
      'Ad Library API icin Meta access token gerekli.'
    );
  }
  return token;
}

async function apiRequest(url, retryCount = 0) {
  const { max_retries, base_delay_ms } = metaConfig.rate_limit;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    const errorCode = data.error.code;
    const isRateLimit = [4, 17, 32].includes(errorCode);

    if (isRateLimit && retryCount < max_retries) {
      const delay = base_delay_ms * Math.pow(2, retryCount);
      console.log(`  Rate limit (kod ${errorCode}), bekleniyor... ${delay / 1000}s (${retryCount + 1}. deneme)`);
      await new Promise(r => setTimeout(r, delay));
      return apiRequest(url, retryCount + 1);
    }

    if (errorCode === 190) {
      throw new Error(
        'Meta API token suresi dolmus veya gecersiz.\n' +
        'Yeni token alin ve .env dosyasindaki META_ACCESS_TOKEN\'i guncelleyin.'
      );
    }

    throw new Error(`Meta API hatasi (kod ${errorCode}): ${data.error.message}`);
  }

  return data;
}

async function fetchCompetitorAds(competitor, token) {
  const fields = 'ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,page_name,publisher_platforms';
  const searchTerms = encodeURIComponent(competitor);
  const baseUrl = `${metaConfig.base_url}/${metaConfig.api_version}/ads_archive`;

  let allAds = [];
  let url = `${baseUrl}?search_terms=${searchTerms}&ad_reached_countries=TR&ad_type=ALL&fields=${fields}&limit=100&access_token=${token}`;

  const maxPages = 5; // max 500 reklam/marka
  let page = 0;

  while (url && page < maxPages) {
    const data = await apiRequest(url);

    if (data.data && data.data.length > 0) {
      allAds = allAds.concat(data.data);
    }

    url = (data.paging && data.paging.next) ? data.paging.next : null;
    page++;
  }

  // Normalize
  const today = new Date();
  return allAds.map(ad => {
    const startDate = ad.ad_delivery_start_time || null;
    const endDate = ad.ad_delivery_stop_time || null;
    const isActive = !endDate;

    let daysActive = 0;
    if (startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : today;
      daysActive = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }

    return {
      page_name: ad.page_name || competitor,
      headline: (ad.ad_creative_link_titles && ad.ad_creative_link_titles[0]) || '',
      body: (ad.ad_creative_bodies && ad.ad_creative_bodies[0]) || '',
      start_date: startDate ? startDate.split('T')[0] : null,
      end_date: endDate ? endDate.split('T')[0] : null,
      days_active: daysActive,
      platforms: ad.publisher_platforms || [],
      is_active: isActive
    };
  });
}

// ==================== OZET ====================

function summarizeCompetitor(ads) {
  const activeAds = ads.filter(a => a.is_active);

  // Platform dagilimi
  const platformCounts = {};
  for (const ad of ads) {
    for (const p of ad.platforms) {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
  }

  // En uzun suredir yayinda
  const longestRunning = [...ads]
    .sort((a, b) => b.days_active - a.days_active)
    .slice(0, 5)
    .map(a => ({
      headline: a.headline,
      body: a.body ? a.body.slice(0, 100) + (a.body.length > 100 ? '...' : '') : '',
      days_active: a.days_active,
      platforms: a.platforms,
      is_active: a.is_active
    }));

  // Ortalama yayinda kalma suresi
  const avgDays = ads.length > 0
    ? Math.round(ads.reduce((sum, a) => sum + a.days_active, 0) / ads.length)
    : 0;

  // Ornek metinler (benzersiz, bos olmayan)
  const uniqueHeadlines = [...new Set(ads.map(a => a.headline).filter(h => h))].slice(0, 10);
  const uniqueBodies = [...new Set(ads.map(a => a.body).filter(b => b))].slice(0, 10);

  return {
    total_ads: ads.length,
    active_ads: activeAds.length,
    avg_days_active: avgDays,
    longest_running: longestRunning,
    platform_distribution: platformCounts,
    sample_headlines: uniqueHeadlines,
    sample_bodies: uniqueBodies
  };
}

// ==================== CLAUDE ANALIZ ====================

async function analyzeWithClaude(competitorDetails) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    console.error('UYARI: ANTHROPIC_API_KEY bulunamadi, Claude analizi atlaniyor.');
    return null;
  }

  const client = new Anthropic();

  // Rakip verilerini ozetleyip Claude'a gonder
  let competitorSummary = '';
  for (const [name, data] of Object.entries(competitorDetails)) {
    competitorSummary += `\n## ${name}\n`;
    competitorSummary += `Toplam reklam: ${data.total_ads}, Aktif: ${data.active_ads}\n`;
    competitorSummary += `Ortalama yayinda kalma: ${data.avg_days_active} gun\n`;

    if (data.sample_headlines.length > 0) {
      competitorSummary += `\nOrnek Headline'lar:\n`;
      for (const h of data.sample_headlines) {
        competitorSummary += `- "${h}"\n`;
      }
    }

    if (data.sample_bodies.length > 0) {
      competitorSummary += `\nOrnek Reklam Metinleri:\n`;
      for (const b of data.sample_bodies) {
        competitorSummary += `- "${b.slice(0, 200)}"\n`;
      }
    }

    if (data.longest_running.length > 0) {
      competitorSummary += `\nEn uzun suredir yayinda olan reklamlar:\n`;
      for (const lr of data.longest_running) {
        competitorSummary += `- "${lr.headline}" (${lr.days_active} gun, ${lr.is_active ? 'hala aktif' : 'sona erdi'})\n`;
      }
    }
  }

  const prompt = `Asagida rakip markalarin Facebook/Instagram reklamlari var. Bu verileri analiz et ve stratejik icgoruler sun.

${competitorSummary}

Asagidaki alanlari analiz et ve SADECE JSON formatinda yanit ver:

1. common_patterns: Rakiplerin sik kullandigi ortak temalar, kelimeler, stratejiler (en az 5 madde)
2. differentiation_opportunities: Rakiplerin KULLANMADIGI ama potansiyel olan acilar/stratejiler (en az 3 madde)
3. tone_analysis: Reklam tonlarinin yuzdesi (resmi, samimi, aciliyet, duygusal — toplam 100 olmali)
4. top_strategies: Uzun suredir yayinda olan reklamlardan cikarilan en etkili stratejiler (en az 3 madde)
5. recommendations: Musteriye ozel oneriler — bu rakiplere karsi nasil farklilasabilir (en az 3 madde)

SADECE asagidaki JSON formatinda yanit ver:
{
  "common_patterns": ["...", "..."],
  "differentiation_opportunities": ["...", "..."],
  "tone_analysis": { "resmi": 0, "samimi": 0, "aciliyet": 0, "duygusal": 0 },
  "top_strategies": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  const message = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: claudeConfig.max_tokens,
    messages: [{ role: 'user', content: prompt }],
    system: 'Sen deneyimli bir dijital pazarlama stratejistisin. Turkce yaz. Turkce karakterleri dogru kullan. Yanit olarak SADECE istenilen JSON formatini dondur.'
  });

  const responseText = message.content[0].text.trim();

  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    console.error('UYARI: Claude yaniti JSON olarak parse edilemedi.');
    return null;
  }
}

// ==================== ANA FONKSIYON ====================

async function competitorAnalysis(options) {
  const opts = options || {};
  const competitors = opts.competitors || [];
  const sector = opts.sector || null;

  if (competitors.length === 0) {
    throw new Error('En az bir rakip marka belirtin. --competitors="marka1,marka2"');
  }

  const token = getToken();

  console.log(`Rakip sayisi: ${competitors.length}`);
  console.log(`Rakipler: ${competitors.join(', ')}`);
  if (sector) console.log(`Sektor: ${sector}`);
  console.log('');

  const competitorDetails = {};
  let totalAds = 0;

  for (let i = 0; i < competitors.length; i++) {
    const competitor = competitors[i].trim();
    console.log(`[${i + 1}/${competitors.length}] "${competitor}" reklamlari cekiliyor...`);

    try {
      const ads = await fetchCompetitorAds(competitor, token);
      console.log(`  ${ads.length} reklam bulundu.`);

      const summary = summarizeCompetitor(ads);
      competitorDetails[competitor] = summary;
      totalAds += ads.length;

      console.log(`  Aktif: ${summary.active_ads}, Ort. yayinda kalma: ${summary.avg_days_active} gun`);
    } catch (err) {
      console.log(`  HATA: ${err.message}`);
      competitorDetails[competitor] = {
        total_ads: 0, active_ads: 0, avg_days_active: 0,
        longest_running: [], platform_distribution: {},
        sample_headlines: [], sample_bodies: [],
        error: err.message
      };
    }
  }

  console.log(`\nToplam ${totalAds} rakip reklami toplandı.`);

  // Claude ile stratejik analiz
  let claudeAnalysis = null;
  if (totalAds > 0) {
    console.log('\nClaude ile stratejik analiz yapiliyor...');
    try {
      claudeAnalysis = await analyzeWithClaude(competitorDetails);
      if (claudeAnalysis) {
        console.log('Stratejik analiz tamamlandi.');
      }
    } catch (err) {
      console.log(`Claude analiz hatasi: ${err.message}`);
    }
  } else {
    console.log('Reklam bulunamadi, Claude analizi atlaniyor.');
  }

  // Sonucu kaydet
  const today = new Date().toISOString().split('T')[0];
  const result = {
    analysis_date: today,
    competitors: competitors,
    sector: sector,
    total_ads_found: totalAds,
    competitor_details: competitorDetails,
    claude_analysis: claudeAnalysis ? {
      model: claudeConfig.model,
      ...claudeAnalysis
    } : null
  };

  const outputDir = path.join(__dirname, '..', 'data', 'analysis');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `competitor-${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n=== RAKIP ANALIZI TAMAMLANDI ===`);
  console.log(`Toplam rakip reklami: ${totalAds}`);
  if (claudeAnalysis) {
    console.log(`Ortak pattern: ${claudeAnalysis.common_patterns ? claudeAnalysis.common_patterns.length : 0}`);
    console.log(`Farklilaşma firsati: ${claudeAnalysis.differentiation_opportunities ? claudeAnalysis.differentiation_opportunities.length : 0}`);
    console.log(`Oneri: ${claudeAnalysis.recommendations ? claudeAnalysis.recommendations.length : 0}`);
  }
  console.log(`Sonuc: ${outputPath}`);

  return result;
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

  if (!args.competitors) {
    console.error('Kullanim: node scripts/06-competitor-analysis.js --competitors="marka1,marka2" [--sector=yemek]');
    process.exit(1);
  }

  competitorAnalysis({
    competitors: args.competitors.split(','),
    sector: args.sector || null
  }).catch((err) => {
    console.error('Hata:', err.message);
    process.exit(1);
  });
}

module.exports = competitorAnalysis;
