const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
async function run() {
  try {
    // Drop old table to start clean or alter it. Since it's early, dropping is safer for schema consistency.
    await sql`DROP TABLE IF EXISTS logs`;
    await sql`CREATE TABLE logs (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      module VARCHAR(50) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    console.log('Logs table migrated successfully');
  } catch (e) {
    console.error('DB error:', e);
  }
}
run();
