require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const metaConfig = require(path.join(__dirname, '..', 'config', 'meta-config.json'));

const NUMERIC_FIELDS = [
  'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
  'cpa', 'conversions', 'conversion_rate', 'spend', 'roas'
];

// ==================== CSV MODU ====================

function fetchData(fileName) {
  const filePath = path.join(__dirname, '..', 'data', 'input', fileName || 'sample-ads.csv');

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`Dosya bulunamadi: ${filePath}`));
    }

    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        for (const field of NUMERIC_FIELDS) {
          if (row[field] !== undefined) {
            row[field] = parseFloat(row[field]);
          }
        }
        results.push(row);
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// ==================== META API MODU ====================

function getMetaEnv() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token) {
    throw new Error(
      'META_ACCESS_TOKEN .env dosyasinda bulunamadi.\n' +
      'Meta Ads API kullanmak icin .env dosyasina asagidakileri ekleyin:\n' +
      '  META_ACCESS_TOKEN=your_token\n' +
      '  META_AD_ACCOUNT_ID=act_XXXXXXXXX\n' +
      'Token alma rehberi icin META-SETUP.md dosyasina bakin.'
    );
  }

  if (!accountId || accountId === 'act_XXXXXXXXX') {
    throw new Error(
      'META_AD_ACCOUNT_ID .env dosyasinda ayarlanmamis.\n' +
      'Ornek: META_AD_ACCOUNT_ID=act_123456789'
    );
  }

  return { token, accountId };
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

    // Token expired/invalid özel mesaj
    if (errorCode === 190) {
      throw new Error(
        'Meta API token suresi dolmus veya gecersiz.\n' +
        'Yeni bir long-lived token alin ve .env dosyasindaki META_ACCESS_TOKEN\'i guncelleyin.\n' +
        'Rehber: META-SETUP.md'
      );
    }

    throw new Error(`Meta API hatasi (kod ${errorCode}): ${data.error.message}`);
  }

  return data;
}

async function validateToken(token) {
  const url = `${metaConfig.base_url}/${metaConfig.api_version}/me?access_token=${token}`;
  const data = await apiRequest(url);
  console.log(`Token dogrulandi. Kullanici: ${data.name || data.id}`);
  return true;
}

async function fetchInsights(accountId, token, timeRange) {
  const fields = metaConfig.insights_fields.join(',');
  const timeRangeParam = encodeURIComponent(JSON.stringify(timeRange));
  const baseUrl = `${metaConfig.base_url}/${metaConfig.api_version}/${accountId}/insights`;

  let allResults = [];
  let url = `${baseUrl}?level=ad&fields=${fields}&time_range=${timeRangeParam}&limit=100&access_token=${token}`;

  while (url) {
    const data = await apiRequest(url);

    if (data.data && data.data.length > 0) {
      allResults = allResults.concat(data.data);
    }

    // Pagination: sonraki sayfa
    url = (data.paging && data.paging.next) ? data.paging.next : null;
  }

  return allResults;
}

async function fetchCreative(adId, token) {
  const fields = metaConfig.creative_fields.join(',');
  const url = `${metaConfig.base_url}/${metaConfig.api_version}/${adId}/adcreatives?fields=${fields}&access_token=${token}`;

  try {
    const data = await apiRequest(url);
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
  } catch (err) {
    console.log(`  UYARI: ad_${adId} kreatif alinamadi: ${err.message}`);
  }

  return null;
}

function extractConversions(actions) {
  if (!actions || !Array.isArray(actions)) return 0;

  const conversionAction = actions.find(a =>
    a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
    a.action_type === 'purchase' ||
    a.action_type === 'complete_registration' ||
    a.action_type === 'lead'
  );

  return conversionAction ? parseFloat(conversionAction.value) : 0;
}

function extractCPA(costPerAction) {
  if (!costPerAction || !Array.isArray(costPerAction)) return 0;

  const cpaAction = costPerAction.find(a =>
    a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
    a.action_type === 'purchase' ||
    a.action_type === 'complete_registration' ||
    a.action_type === 'lead'
  );

  return cpaAction ? parseFloat(cpaAction.value) : 0;
}

function extractConversionValue(actions) {
  if (!actions || !Array.isArray(actions)) return 0;

  const valueAction = actions.find(a =>
    a.action_type === 'offsite_conversion.fb_pixel_purchase'
  );

  return valueAction ? parseFloat(valueAction.value) : 0;
}

function normalizeInsight(insight, creative) {
  const impressions = parseFloat(insight.impressions || 0);
  const clicks = parseFloat(insight.clicks || 0);
  const spend = parseFloat(insight.spend || 0);
  const conversions = extractConversions(insight.actions);
  const cpa = extractCPA(insight.cost_per_action_type);
  const conversionValue = extractConversionValue(insight.actions);

  return {
    campaign_name: insight.campaign_name || '',
    ad_group: insight.adset_name || '',
    ad_name: insight.ad_name || '',
    headline: (creative && creative.title) || insight.ad_name || '',
    description: (creative && creative.body) || '',
    impressions,
    clicks,
    ctr: parseFloat(insight.ctr || 0),
    cpc: parseFloat(insight.cpc || 0),
    cpm: parseFloat(insight.cpm || 0),
    cpa: cpa,
    conversions,
    conversion_rate: impressions > 0 ? (conversions / impressions * 100) : 0,
    spend,
    roas: spend > 0 ? (conversionValue / spend) : 0,
    date_start: insight.date_start || '',
    date_stop: insight.date_stop || '',
    image_url: (creative && (creative.image_url || creative.thumbnail_url)) || ''
  };
}

function calculateTimeRange(options) {
  const { days, startDate, endDate } = options;

  if (startDate && endDate) {
    return { since: startDate, until: endDate };
  }

  const d = days || metaConfig.default_days;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - d);

  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0]
  };
}

function saveToFiles(data, prefix) {
  const today = new Date().toISOString().split('T')[0];
  const baseName = `${prefix || 'meta'}-${today}`;
  const inputDir = path.join(__dirname, '..', 'data', 'input');

  fs.mkdirSync(inputDir, { recursive: true });

  // JSON kaydet
  const jsonPath = path.join(inputDir, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`JSON kaydedildi: ${jsonPath}`);

  // CSV kaydet
  if (data.length > 0) {
    const headers = Object.keys(data[0]).filter(k => k !== 'image_url');
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        const val = String(row[h] || '');
        return val.includes(',') ? `"${val}"` : val;
      });
      csvRows.push(values.join(','));
    }

    const csvPath = path.join(inputDir, `${baseName}.csv`);
    fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
    console.log(`CSV kaydedildi: ${csvPath}`);
  }

  return baseName;
}

async function fetchFromMeta(options = {}) {
  const { token, accountId } = getMetaEnv();

  console.log('Meta Ads API baglantisi kuruluyor...');

  // Token doğrula
  await validateToken(token);

  // Tarih aralığı
  const timeRange = calculateTimeRange(options);
  console.log(`Tarih araligi: ${timeRange.since} → ${timeRange.until}`);

  // Insights çek
  console.log(`Reklam verileri cekiliyor (${accountId})...`);
  const insights = await fetchInsights(accountId, token, timeRange);
  console.log(`${insights.length} reklam verisi alindi.`);

  if (insights.length === 0) {
    console.log('Bu tarih araliginda reklam verisi bulunamadi.');
    return [];
  }

  // Her reklam için kreatif bilgilerini çek
  console.log('Kreatif bilgileri aliniyor...');
  const results = [];

  for (let i = 0; i < insights.length; i++) {
    const insight = insights[i];
    const adId = insight.ad_id;

    let creative = null;
    if (adId) {
      creative = await fetchCreative(adId, token);
    }

    results.push(normalizeInsight(insight, creative));

    if ((i + 1) % 10 === 0) {
      console.log(`  ${i + 1}/${insights.length} reklam islendi.`);
    }
  }

  console.log(`Toplam ${results.length} reklam normalize edildi.`);

  // Dosyalara kaydet
  saveToFiles(results);

  return results;
}

// ==================== CLI ====================

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    } else {
      args._file = arg;
    }
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs();

  if (args.source === 'meta') {
    // Meta API modu
    const options = {};
    if (args.days) options.days = parseInt(args.days);
    if (args.start) options.startDate = args.start;
    if (args.end) options.endDate = args.end;

    console.log('=== META ADS API VERI CEKME ===\n');

    fetchFromMeta(options)
      .then((data) => {
        console.log(`\n${data.length} reklam basariyla cekildi ve kaydedildi.`);
        if (data.length > 0) {
          console.log('\nOrnek veri:');
          console.table(data.slice(0, 5).map(d => ({
            ad_name: d.ad_name,
            headline: d.headline,
            ctr: d.ctr,
            cpa: d.cpa,
            roas: d.roas,
            spend: d.spend,
            conversions: d.conversions
          })));
        }
      })
      .catch((err) => {
        console.error('\nHata:', err.message);
        process.exit(1);
      });
  } else {
    // CSV modu (mevcut)
    const fileName = args._file || args.input || 'sample-ads.csv';
    console.log(`CSV okunuyor: ${fileName}`);

    fetchData(fileName)
      .then((data) => {
        console.log(`${data.length} reklam okundu.\n`);
        console.table(data.map(d => ({
          ad_name: d.ad_name,
          headline: d.headline,
          ctr: d.ctr,
          cpa: d.cpa,
          roas: d.roas,
          spend: d.spend,
          conversions: d.conversions
        })));
      })
      .catch((err) => {
        console.error('Hata:', err.message);
        process.exit(1);
      });
  }
}

module.exports = { fetchData, fetchFromMeta };
