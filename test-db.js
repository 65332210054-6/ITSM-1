const url = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const { neon } = require('@neondatabase/serverless');
const sql = neon(url);
async function run() {
  try {
    const res = await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='departments'`;
    console.log('Columns:', res);
  } catch (e) {
    console.error('DB error:', e);
  }
}
run();
