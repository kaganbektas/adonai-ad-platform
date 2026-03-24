const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ADONAI, a senior AI marketing advisor. You have access to the user's advertising analysis data including brand positioning, benchmark comparisons, competitor analysis, and market trends.

Your role:
- Provide actionable, specific marketing advice grounded in the user's data
- Identify opportunities and threats from competitor and trend data
- Recommend budget allocation, creative strategy, and targeting improvements
- Speak concisely and professionally — like a CMO advisor, not a chatbot
- Use metrics and percentages when available
- Respond in the same language as the user's message

Format your responses with clear structure: use bullet points, bold for key metrics, and short paragraphs.`;

// Helper: load latest completed analysis for user
async function getLatestAnalysis(userId) {
  const analyses = await db.getAnalysesByUser(userId);
  const completed = analyses.find(a => a.status === 'completed');
  return completed || null;
}

// Helper: load specific analysis with auth check
async function getAnalysisForUser(analysisId, userId) {
  const analysis = await db.getAnalysisById(analysisId);
  if (!analysis) return null;
  if (analysis.user_id !== userId) return null;
  return analysis;
}

function safeParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function buildContext(analysis) {
  const brand = safeParse(analysis.brand_data);
  const analysisData = safeParse(analysis.analysis_data);
  const competitors = safeParse(analysis.competitor_data);
  const trends = safeParse(analysis.trend_data);

  const parts = [];
  parts.push(`Client: ${analysis.client_name || 'Unknown'}`);
  parts.push(`URL: ${analysis.url}`);
  parts.push(`Sector: ${analysis.sector || 'Unknown'}`);

  if (brand) parts.push(`\n## Brand Analysis\n${JSON.stringify(brand, null, 2)}`);
  if (analysisData) {
    const benchmark = analysisData.benchmark_comparison;
    if (benchmark) parts.push(`\n## Benchmark Comparison\n${JSON.stringify(benchmark, null, 2)}`);
    if (analysisData.total_ads_analyzed) parts.push(`Total ads analyzed: ${analysisData.total_ads_analyzed}`);
    if (analysisData.summary) parts.push(`Summary: ${analysisData.summary}`);
  }
  if (competitors) parts.push(`\n## Competitor Analysis\n${JSON.stringify(competitors, null, 2)}`);
  if (trends) parts.push(`\n## Trend Analysis\n${JSON.stringify(trends, null, 2)}`);

  return parts.join('\n');
}

// POST /api/ai/chat — conversational AI with analysis context
router.post('/chat', async (req, res) => {
  const { message, analysisId, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let analysis = null;
    if (analysisId) {
      analysis = await getAnalysisForUser(analysisId, req.user.userId);
    }
    if (!analysis) {
      analysis = await getLatestAnalysis(req.user.userId);
    }

    const contextBlock = analysis
      ? `\n\n<analysis_data>\n${buildContext(analysis)}\n</analysis_data>`
      : '\n\n(No analysis data available yet. The user has not completed any analyses.)';

    const messages = [];

    // Include conversation history (last 10 exchanges)
    if (Array.isArray(history)) {
      const recent = history.slice(-20);
      for (const h of recent) {
        if (h.role === 'user' || h.role === 'assistant') {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT + contextBlock,
      messages,
    });

    const reply = response.content[0]?.text || 'No response generated.';
    res.json({ reply, analysisId: analysis?.id || null });
  } catch (err) {
    console.error('AI chat error:', err.message);
    if (err.status === 401 || err.message?.includes('api_key')) {
      return res.status(503).json({ error: 'AI service not configured. Add ANTHROPIC_API_KEY to server .env' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/insights — generate insight cards from latest analysis
router.post('/insights', async (req, res) => {
  const { analysisId } = req.body;

  try {
    let analysis = null;
    if (analysisId) {
      analysis = await getAnalysisForUser(analysisId, req.user.userId);
    }
    if (!analysis) {
      analysis = await getLatestAnalysis(req.user.userId);
    }

    if (!analysis) {
      return res.json({ insights: [], recommendations: [], analysisId: null });
    }

    const context = buildContext(analysis);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are a marketing data analyst. Respond ONLY with valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Analyze this marketing data and return JSON with two arrays:

1. "insights" — 4-6 insight cards, each with:
   - "type": "critical" | "positive" | "opportunity" | "warning"
   - "title": short headline (e.g. "CPC 262% above industry average")
   - "explanation": 1-2 sentence detail
   - "metric": the key number/percentage if applicable

2. "recommendations" — 4-6 priority-ordered action items, each with:
   - "priority": "critical" | "warning" | "opportunity"
   - "action": what to do (1 sentence)
   - "reason": why (1 sentence)
   - "impact": expected impact (1 sentence)

Data:
${context}`
      }],
    });

    const text = response.content[0]?.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { insights: [], recommendations: [] };
    }

    res.json({
      insights: parsed.insights || [],
      recommendations: parsed.recommendations || [],
      analysisId: analysis.id,
    });
  } catch (err) {
    console.error('AI insights error:', err.message);
    if (err.status === 401 || err.message?.includes('api_key')) {
      return res.status(503).json({ error: 'AI service not configured. Add ANTHROPIC_API_KEY to server .env' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

module.exports = router;
