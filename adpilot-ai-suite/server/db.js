const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'adonai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
});

// Test connection and run indexes on startup
pool.query('SELECT 1').then(async () => {
  console.log('PostgreSQL connected (adonai)');
  // Ensure indexes exist
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (user_id);
      CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses (status);
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analyses_user_status ON analyses (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    console.log('DB indexes verified');
  } catch (err) {
    console.warn('Index creation skipped:', err.message);
  }
}).catch(err => {
  console.error('PostgreSQL connection failed:', err.message);
});

const db = {
  // Users
  async getUserByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async getUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async createUser({ id, name, email, password_hash }) {
    const { rows } = await pool.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, email, password_hash]
    );
    return rows[0];
  },

  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // Analyses
  async getAnalysesByUser(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM analyses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  async getAnalysisById(id) {
    const { rows } = await pool.query('SELECT * FROM analyses WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async createAnalysis({ id, user_id, url, status, sector, client_name }) {
    const { rows } = await pool.query(
      `INSERT INTO analyses (id, user_id, url, status, sector, client_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, user_id, url, status || 'running', sector || null, client_name || null]
    );
    return rows[0];
  },

  async updateAnalysis(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        // JSONB columns: store as JSON
        if (['brand_data', 'competitor_data', 'trend_data', 'report_data', 'analysis_data'].includes(key)) {
          fields.push(`${key} = $${idx}::jsonb`);
          values.push(typeof val === 'string' ? val : JSON.stringify(val));
        } else {
          fields.push(`${key} = $${idx}`);
          values.push(val);
        }
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE analyses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async getStatsByUser(userId) {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) as total_analyses,
        COUNT(*) FILTER (WHERE status = 'completed') as total_reports,
        COALESCE(SUM(
          CASE WHEN competitor_data IS NOT NULL
          THEN jsonb_array_length(
            CASE
              WHEN competitor_data ? 'competitors' THEN competitor_data->'competitors'
              WHEN competitor_data ? 'competitor_details' THEN competitor_data->'competitor_details'
              ELSE '[]'::jsonb
            END
          )
          ELSE 0 END
        ), 0) as competitors_tracked
      FROM analyses WHERE user_id = $1`,
      [userId]
    );
    const r = rows[0];
    return {
      totalAnalyses: parseInt(r.total_analyses) || 0,
      totalCreatives: (parseInt(r.total_reports) || 0) * 6,
      totalReports: parseInt(r.total_reports) || 0,
      competitorsTracked: parseInt(r.competitors_tracked) || 0,
    };
  },
};

module.exports = db;
