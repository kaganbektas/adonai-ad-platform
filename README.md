# ADONAI (AD ON AI)

**AI-powered marketing automation platform that replaces a 6-person marketing team.**

Enter your website URL → ADONAI's AI agents analyze your brand, discover competitors, identify trends, generate ad copy & creatives, benchmark your performance, and deliver a professional PDF report. One command. Full automation.

## What it does

- **Brand Analysis** — Auto-detects sector, tone, audience, USPs from your website
- **Competitor Intelligence** — Finds competitors, analyzes their ad strategies via Facebook Ad Library
- **Trend Discovery** — Identifies winning patterns, emotional triggers, seasonal opportunities
- **Performance Benchmarking** — Compares your metrics against industry averages (score out of 100)
- **Ad Copy Generation** — Creates headline & description variations using Claude AI
- **Ad Creative Rendering** — Produces ready-to-use visuals (5 styles × 4 sizes, sector-specific)
- **Professional Reports** — Compiles insights, action plans into HTML + PDF reports
- **AI Insights Chat** — Ask your AI marketing advisor anything about your strategy

## Tech Stack

**Backend:** Node.js, Express.js, PostgreSQL, Claude API (Anthropic), Meta Ads API, Puppeteer

**Frontend:** React, TypeScript, Tailwind CSS, Vite

**Pipeline:** 9-step automated workflow with retry, partial save, async execution

## Quick Start

```bash
# Clone
git clone https://github.com/kaganbektas/adonai-ad-platform.git

# Install
cd adonai-ad-platform && npm install

# Configure
cp .env.example .env
# Add your ANTHROPIC_API_KEY and META_ACCESS_TOKEN

# Run pipeline (CLI)
node scripts/run-pipeline.js --url=https://example.com --sector=yemek --report --sizes=feed

# Run web app
cd server && node index.js  # Backend on :3001
cd client && npm run dev    # Frontend on :5174
```

## License

MIT
