const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('./db');

// Postgres can accept connections a moment before it is ready ("the
// database system is starting up", 57P03) or refuse them while it boots:
// wait up to ~30 s instead of failing the container start.
async function waitForDatabase() {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      const transient = err.code === '57P03' || err.code === 'ECONNREFUSED';
      if (!transient || attempt >= 30) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function migrate() {
  await waitForDatabase();
  // Tracks which migration files have already run so each one applies
  // exactly once — the container re-runs this on every boot (not just the
  // first), and migrations that DROP a column aren't safe to replay blind.
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const appliedRes = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRes.rows.map(r => r.filename));

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Running migration ${file}...`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
  }
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
