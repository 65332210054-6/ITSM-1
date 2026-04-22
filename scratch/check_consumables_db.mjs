import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function check() {
  try {
    // Migration logic
    console.log('Ensuring tables exist...');
    await sql`
        CREATE TABLE IF NOT EXISTS consumables (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          quantity INTEGER DEFAULT 0,
          min_quantity INTEGER DEFAULT 5,
          unit TEXT DEFAULT 'ชิ้น',
          location TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    await sql`
        CREATE TABLE IF NOT EXISTS consumable_logs (
          id TEXT PRIMARY KEY,
          consumable_id TEXT REFERENCES consumables(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          user_id TEXT REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    
    if (tables.some(t => t.table_name === 'consumables')) {
      console.log('✅ consumables table exists.');
    }
    if (tables.some(t => t.table_name === 'consumable_logs')) {
      console.log('✅ consumable_logs table exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
