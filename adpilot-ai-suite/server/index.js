require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const analysesRoutes = require('./routes/analyses');
const pipelineRoutes = require('./routes/pipeline');
const aiRoutes = require('./routes/ai');
const { authLimiter, pipelineLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Static files — serve pipeline output images/reports
const outputDir = path.resolve(__dirname, '..', '..', 'ad-automation', 'data', 'output');
app.use('/api/static', express.static(outputDir));

// Static files — serve generated reports (HTML/PDF)
const reportsDir = path.resolve(__dirname, '..', '..', 'ad-automation', 'data', 'reports');
app.use('/api/static/reports', express.static(reportsDir));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prevent unhandled errors from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`ADONAI API server running on port ${PORT}`);
});
