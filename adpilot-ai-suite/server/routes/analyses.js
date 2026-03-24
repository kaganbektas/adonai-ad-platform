const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getProgress } = require('../lib/progressStore');

const router = express.Router();
router.use(requireAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/analyses — list user's analyses
router.get('/', async (req, res) => {
  try {
    const analyses = await db.getAnalysesByUser(req.user.userId);
    const list = analyses.map(a => ({
      id: a.id,
      url: a.url,
      status: a.status,
      sector: a.sector,
      client_name: a.client_name,
      created_at: a.created_at,
      completed_at: a.completed_at,
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStatsByUser(req.user.userId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/:id/status — REST polling status (alternative to SSE)
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid analysis ID' });

  try {
    // 1. Check in-memory / file progress
    const progress = getProgress(id);
    if (progress) {
      return res.json({
        analysisId: id,
        status: progress.status,
        currentStep: progress.currentStep,
        totalSteps: progress.totalSteps,
        progress: Math.round(((progress.currentStep || 0) / (progress.totalSteps || 1)) * 100),
        steps: progress.steps,
      });
    }

    // 2. Fallback to DB
    const analysis = await db.getAnalysisById(id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    if (analysis.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      analysisId: id,
      status: analysis.status,
      currentStep: analysis.status === 'completed' ? 9 : 0,
      totalSteps: 9,
      progress: analysis.status === 'completed' ? 100 : 0,
      steps: [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/:id/results — structured results
router.get('/:id/results', async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid analysis ID' });

  try {
    const analysis = await db.getAnalysisById(id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    if (analysis.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const brand = safeParse(analysis.brand_data);
    const analysisData = safeParse(analysis.analysis_data);
    const competitors = safeParse(analysis.competitor_data);
    const trends = safeParse(analysis.trend_data);
    const reportData = safeParse(analysis.report_data);

    // Build report URLs
    let report = null;
    if (reportData) {
      const clientSlug = (analysis.client_name || 'unknown').toLowerCase();
      const date = analysis.created_at ? new Date(analysis.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      report = {
        htmlUrl: `/api/static/reports/report-${clientSlug}-${date}.html`,
        pdfUrl: `/api/static/reports/report-${clientSlug}-${date}.pdf`,
        ...reportData,
      };
    }

    // Scan for creatives
    const creatives = scanCreatives(analysis.created_at);

    res.json({
      analysisId: id,
      status: analysis.status,
      brand,
      benchmark: analysisData ? (() => {
        const src = analysisData.analysisResult || analysisData;
        return {
          ...(src.benchmark_comparison || {}),
          total_ads_analyzed: src.total_ads_analyzed,
          summary: src.summary,
          top_performers: src.top_performers,
          low_performers: src.low_performers,
        };
      })() : null,
      competitors,
      trends,
      creatives,
      report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/:id/creatives — list generated images
router.get('/:id/creatives', async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid analysis ID' });

  try {
    const analysis = await db.getAnalysisById(id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    if (analysis.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const creatives = scanCreatives(analysis.created_at);
    res.json({ analysisId: id, creatives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/:id/report — serve report file directly
router.get('/:id/report', async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid analysis ID' });

  try {
    const analysis = await db.getAnalysisById(id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    if (analysis.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const format = req.query.format === 'pdf' ? 'pdf' : 'html';
    const clientSlug = (analysis.client_name || 'unknown').toLowerCase();
    const date = analysis.created_at ? new Date(analysis.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const reportsDir = path.resolve(__dirname, '..', '..', '..', 'ad-automation', 'data', 'reports');
    const fileName = `report-${clientSlug}-${date}.${format}`;
    const filePath = path.join(reportsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Report file not found: ${fileName}` });
    }

    const contentType = format === 'pdf' ? 'application/pdf' : 'text/html';
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses/:id — full detail
router.get('/:id', async (req, res) => {
  try {
    const analysis = await db.getAnalysisById(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    if (analysis.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const detail = {
      id: analysis.id,
      url: analysis.url,
      status: analysis.status,
      sector: analysis.sector,
      client_name: analysis.client_name,
      created_at: analysis.created_at,
      completed_at: analysis.completed_at,
      brand_data: safeParse(analysis.brand_data),
      competitor_data: safeParse(analysis.competitor_data),
      trend_data: safeParse(analysis.trend_data),
      report_data: safeParse(analysis.report_data),
      analysis_data: safeParse(analysis.analysis_data),
    };
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function safeParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function scanCreatives(createdAt) {
  const outputDir = path.resolve(__dirname, '..', '..', '..', 'ad-automation', 'data', 'output');
  const images = [];

  try {
    const date = createdAt ? new Date(createdAt).toISOString().split('T')[0] : null;
    if (!date) return images;

    const dateDir = path.join(outputDir, date);
    if (!fs.existsSync(dateDir)) return images;

    // Scan: output/{date}/{template}/{size}/*.png
    const templates = fs.readdirSync(dateDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const tmpl of templates) {
      const tmplDir = path.join(dateDir, tmpl.name);
      const sizes = fs.readdirSync(tmplDir, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const size of sizes) {
        const sizeDir = path.join(tmplDir, size.name);
        const files = fs.readdirSync(sizeDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
        for (const file of files) {
          images.push({
            url: `/api/static/${date}/${tmpl.name}/${size.name}/${file}`,
            template: tmpl.name,
            size: size.name,
            filename: file,
          });
        }
      }
    }
  } catch {
    // Output dir may not exist yet
  }

  return images;
}

module.exports = router;
