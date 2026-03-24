const fs = require('fs');
const path = require('path');

const STATUS_DIR = path.resolve(__dirname, '..', '..', '..', 'ad-automation', 'data', 'status');

// Shared in-memory progress tracker
const activeRuns = new Map();

function writeStatusFile(analysisId, data) {
  try {
    fs.mkdirSync(STATUS_DIR, { recursive: true });
    const filePath = path.join(STATUS_DIR, `${analysisId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error('writeStatusFile error:', err.message);
  }
}

function readStatusFile(analysisId) {
  try {
    const filePath = path.join(STATUS_DIR, `${analysisId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

// Get progress from in-memory first, then file fallback
function getProgress(analysisId) {
  const mem = activeRuns.get(analysisId);
  if (mem) return mem;
  return readStatusFile(analysisId);
}

module.exports = { activeRuns, writeStatusFile, readStatusFile, getProgress };
