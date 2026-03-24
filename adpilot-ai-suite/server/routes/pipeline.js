const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { pipelineLimiter } = require('../middleware/rateLimiter');
const { activeRuns, writeStatusFile, readStatusFile } = require('../lib/progressStore');

const router = express.Router();

// Pipeline step definitions — full 9-step pipeline
const PIPELINE_STEPS = [
  { key: 'brand_analysis', name: 'Brand Analysis', script: '09-brand-analysis' },
  { key: 'fetch_data', name: 'Fetch Ad Data', script: '01-fetch-data' },
  { key: 'analyze', name: 'Data Analysis', script: '02-analyze' },
  { key: 'competitor_analysis', name: 'Competitor Analysis', script: '06-competitor-analysis' },
  { key: 'trend_analysis', name: 'Trend Analysis', script: '07-trend-analysis' },
  { key: 'generate', name: 'Copy Generation', script: '03-generate-copy' },
  { key: 'render_ads', name: 'Ad Rendering', script: '04-render-ads' },
  { key: 'generate_images', name: 'Image Generation', script: '05-generate-images' },
  { key: 'report', name: 'Report Generation', script: '08-generate-report' },
];

// POST /api/pipeline/run — start a pipeline run
router.post('/run', requireAuth, pipelineLimiter, async (req, res) => {
  const { url, competitors, sector: reqSector, source, csvFile } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // URL validation
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'URL must use http or https protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (source === 'csv' && !csvFile) {
    return res.status(400).json({ error: 'csvFile is required when source is "csv"' });
  }

  // CSV size limit: 5MB base64 (~3.75MB actual)
  if (csvFile && csvFile.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'CSV file too large. Maximum 5MB allowed.' });
  }

  const analysisId = uuidv4();
  let clientName = '';
  try {
    clientName = new URL(url).hostname.replace('www.', '').split('.')[0];
  } catch {
    clientName = url;
  }

  // Create analysis record
  const analysis = {
    id: analysisId,
    user_id: req.user.userId,
    url,
    status: 'running',
    sector: reqSector || null,
    client_name: clientName,
    brand_data: null,
    competitor_data: null,
    trend_data: null,
    report_data: null,
    analysis_data: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  await db.createAnalysis(analysis);

  // Initialize progress
  const progressData = {
    analysisId,
    currentStep: 0,
    totalSteps: PIPELINE_STEPS.length,
    status: 'running',
    steps: PIPELINE_STEPS.map(s => ({ key: s.key, name: s.name, status: 'pending', duration_ms: 0 })),
    result: null,
    client_name: clientName,
  };
  activeRuns.set(analysisId, progressData);
  writeStatusFile(analysisId, progressData);

  // Handle CSV upload
  let csvFilePath = null;
  if (source === 'csv' && csvFile) {
    try {
      const inputDir = path.resolve(__dirname, '..', '..', '..', 'ad-automation', 'data', 'input');
      fs.mkdirSync(inputDir, { recursive: true });
      csvFilePath = path.join(inputDir, `upload-${analysisId}.csv`);
      fs.writeFileSync(csvFilePath, Buffer.from(csvFile, 'base64'));
    } catch (err) {
      console.error('CSV write error:', err.message);
    }
  }

  // Start pipeline in background
  runPipelineAsync(analysisId, url, competitors, { source, csvFilePath, sector: reqSector }).catch(async (err) => {
    console.error(`Pipeline error for ${analysisId}:`, err.message);
    const progress = activeRuns.get(analysisId);
    if (progress) {
      progress.status = 'failed';
      progress.error = err.message;
      writeStatusFile(analysisId, progress);
    }
    await db.updateAnalysis(analysisId, { status: 'failed' });
  });

  res.status(201).json({ id: analysisId, status: 'running' });
});

// GET /api/pipeline/:id/progress — SSE endpoint
router.get('/:id/progress', (req, res) => {
  // SSE auth via query param (EventSource can't set headers)
  const jwt = require('jsonwebtoken');
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let interval = null;

  const sendProgress = async () => {
    // Try in-memory first, then file fallback
    let progress = activeRuns.get(id);
    if (!progress) {
      progress = readStatusFile(id);
    }

    if (!progress) {
      // Check DB for completed analysis
      const analysis = await db.getAnalysisById(id);
      if (analysis && (analysis.status === 'completed' || analysis.status === 'failed')) {
        res.write(`data: ${JSON.stringify({ status: analysis.status, currentStep: PIPELINE_STEPS.length, totalSteps: PIPELINE_STEPS.length })}\n\n`);
        res.write(`event: ${analysis.status}\ndata: done\n\n`);
        if (interval) clearInterval(interval);
        res.end();
      }
      return;
    }

    res.write(`data: ${JSON.stringify({
      analysisId: id,
      currentStep: progress.currentStep,
      totalSteps: progress.totalSteps,
      status: progress.status,
      steps: progress.steps,
    })}\n\n`);

    if (progress.status === 'completed' || progress.status === 'failed') {
      res.write(`event: ${progress.status}\ndata: done\n\n`);
      if (interval) clearInterval(interval);
      res.end();
      // Cleanup in-memory after a delay
      setTimeout(() => activeRuns.delete(id), 30000);
    }
  };

  sendProgress();
  interval = setInterval(sendProgress, 1500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Run the pipeline asynchronously
async function runPipelineAsync(analysisId, url, competitorsArg, options = {}) {
  const progress = activeRuns.get(analysisId);
  if (!progress) return;

  const pipelineDir = path.resolve(__dirname, '..', '..', '..', 'ad-automation');

  // Load pipeline dotenv
  require('dotenv').config({ path: path.join(pipelineDir, '.env') });

  const { source, csvFilePath, sector: reqSector } = options;

  let brandResult = null;
  let competitorResult = null;
  let trendResult = null;
  let sector = reqSector || null;
  let analyzeResult = null;
  let copyResult = null;

  // Step 1: Brand Analysis (always, critical — pipeline can't continue without it)
  await runStep(progress, 0, analysisId, async () => {
    const brandAnalysis = require(path.join(pipelineDir, 'scripts', '09-brand-analysis'));
    brandResult = await brandAnalysis({ url });
    if (brandResult && brandResult.claude_analysis) {
      sector = sector || brandResult.claude_analysis.sector;
      await db.updateAnalysis(analysisId, {
        sector,
        brand_data: JSON.stringify(brandResult.claude_analysis),
      });
    }
    return brandResult;
  }, { retries: 2, critical: true });

  // Step 2: Fetch Data (CSV upload or Meta API)
  await runStep(progress, 1, analysisId, async () => {
    const fetchModule = require(path.join(pipelineDir, 'scripts', '01-fetch-data'));

    if (source === 'csv' && csvFilePath) {
      // CSV mode — read the uploaded CSV file
      const csvFileName = path.basename(csvFilePath);
      const result = await fetchModule.fetchData(csvFileName);
      return result;
    }

    if (source === 'meta') {
      // Meta API mode
      const result = await fetchModule.fetchFromMeta();
      return result;
    }

    // URL-only mode — no data to fetch, skip
    progress.steps[1].status = 'skipped';
    return null;
  });

  // Step 3: Data Analysis (if CSV or Meta data available)
  await runStep(progress, 2, analysisId, async () => {
    if (source === 'csv' && csvFilePath) {
      try {
        const analyze = require(path.join(pipelineDir, 'scripts', '02-analyze'));
        analyzeResult = await analyze(path.basename(csvFilePath));
        await db.updateAnalysis(analysisId, { analysis_data: JSON.stringify(analyzeResult) });
        return analyzeResult;
      } catch (err) {
        console.warn('analyze failed:', err.message);
      }
    } else if (source === 'meta') {
      try {
        const analyze = require(path.join(pipelineDir, 'scripts', '02-analyze'));
        analyzeResult = await analyze({});
        await db.updateAnalysis(analysisId, { analysis_data: JSON.stringify(analyzeResult) });
        return analyzeResult;
      } catch (err) {
        console.warn('analyze failed:', err.message);
      }
    }
    // URL-only mode — minimal analysis result
    analyzeResult = {
      total_ads_analyzed: 0,
      summary: { top_count: 0, low_count: 0 },
      top_performers: [],
      low_performers: [],
    };
    await db.updateAnalysis(analysisId, { analysis_data: JSON.stringify(analyzeResult) });
    return analyzeResult;
  });

  // Step 4: Competitor Analysis
  let competitors = competitorsArg ? competitorsArg.split(',').map(c => c.trim()) : null;
  if (!competitors && brandResult && brandResult.claude_analysis && brandResult.claude_analysis.competitors) {
    competitors = brandResult.claude_analysis.competitors.map(c => c.name);
  }
  await runStep(progress, 3, analysisId, async () => {
    if (competitors && competitors.length > 0) {
      const competitorAnalysis = require(path.join(pipelineDir, 'scripts', '06-competitor-analysis'));
      competitorResult = await competitorAnalysis({ competitors, sector });
      await db.updateAnalysis(analysisId, { competitor_data: JSON.stringify(competitorResult) });
    }
    return competitorResult;
  }, { retries: 2 });

  // Step 5: Trend Analysis
  await runStep(progress, 4, analysisId, async () => {
    const trendAnalysisFn = require(path.join(pipelineDir, 'scripts', '07-trend-analysis'));
    trendResult = await trendAnalysisFn({ sector });
    await db.updateAnalysis(analysisId, { trend_data: JSON.stringify(trendResult) });
    return trendResult;
  }, { retries: 2 });

  // Step 6: Copy Generation
  await runStep(progress, 5, analysisId, async () => {
    const generateCopy = require(path.join(pipelineDir, 'scripts', '03-generate-copy'));
    copyResult = await generateCopy({ sector: sector || null });
    return copyResult;
  }, { retries: 2 });

  // Step 7: Ad Rendering (requires copy files + valid sector)
  await runStep(progress, 6, analysisId, async () => {
    // Check if any copy files exist for render-ads to use
    const copyDir = path.join(pipelineDir, 'data', 'copy');
    const hasCopyFiles = fs.existsSync(copyDir) &&
      fs.readdirSync(copyDir).some(f => f.startsWith('copy-') && f.endsWith('.json'));

    if (!hasCopyFiles && !copyResult) {
      console.warn('render-ads skipped: no copy data available');
      progress.steps[6].status = 'skipped';
      return null;
    }

    // Validate sector — script requires known sector from sectors.json
    let renderSector = sector;
    if (!renderSector) {
      try {
        const sectors = require(path.join(pipelineDir, 'config', 'sectors.json'));
        const validSectors = Object.keys(sectors);
        renderSector = validSectors[0] || 'teknoloji';
      } catch {
        renderSector = 'teknoloji';
      }
    }

    const renderAds = require(path.join(pipelineDir, 'scripts', '04-render-ads'));
    const result = await renderAds({ sector: renderSector, client: progress.client_name });
    return result;
  });

  // Step 8: Image Generation (Nano Banana Pro 2 — requires GEMINI_API_KEY)
  await runStep(progress, 7, analysisId, async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('generate-images skipped: GEMINI_API_KEY not set');
      progress.steps[7].status = 'skipped';
      progress.steps[7].skipReason = 'GEMINI_API_KEY not configured';
      return null;
    }
    const generateImages = require(path.join(pipelineDir, 'scripts', '05-generate-images'));
    const result = await generateImages({ sector, client: progress.client_name });
    return result;
  }, { retries: 2 });

  // Step 9: Report Generation (always)
  await runStep(progress, 8, analysisId, async () => {
    const today = new Date().toISOString().split('T')[0];
    const generateReport = require(path.join(pipelineDir, 'scripts', '08-generate-report'));
    const result = await generateReport({ sector, client: progress.client_name, date: today });
    if (result) {
      await db.updateAnalysis(analysisId, { report_data: JSON.stringify(result) });
    }
    return result;
  }, { retries: 1 });

  // Mark complete
  progress.status = 'completed';
  writeStatusFile(analysisId, progress);
  await db.updateAnalysis(analysisId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}

async function runStep(progress, stepIndex, analysisId, fn, options = {}) {
  // If step was already marked skipped by condition check, don't overwrite
  if (progress.steps[stepIndex].status === 'skipped') {
    progress.currentStep = stepIndex + 1;
    writeStatusFile(analysisId, progress);
    return null;
  }

  const maxRetries = options.retries ?? 2;
  const critical = options.critical ?? false; // critical steps abort pipeline on failure

  progress.currentStep = stepIndex;
  progress.steps[stepIndex].status = 'running';
  progress.steps[stepIndex].retries = 0;
  writeStatusFile(analysisId, progress);

  const start = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      // Only mark success if not already set to skipped inside fn
      if (progress.steps[stepIndex].status === 'running') {
        progress.steps[stepIndex].status = 'success';
      }
      progress.steps[stepIndex].duration_ms = Date.now() - start;
      writeStatusFile(analysisId, progress);
      return result;
    } catch (err) {
      console.error(`Step ${progress.steps[stepIndex].name} attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message);
      progress.steps[stepIndex].retries = attempt + 1;

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`  Retrying in ${delay / 1000}s...`);
        progress.steps[stepIndex].status = 'retrying';
        writeStatusFile(analysisId, progress);
        await new Promise(r => setTimeout(r, delay));
        progress.steps[stepIndex].status = 'running';
        writeStatusFile(analysisId, progress);
      } else {
        progress.steps[stepIndex].status = 'failed';
        progress.steps[stepIndex].error = err.message;
        progress.steps[stepIndex].duration_ms = Date.now() - start;
        writeStatusFile(analysisId, progress);

        if (critical) {
          throw new Error(`Critical step "${progress.steps[stepIndex].name}" failed after ${maxRetries + 1} attempts: ${err.message}`);
        }
        return null;
      }
    }
  }
  return null;
}

module.exports = router;
