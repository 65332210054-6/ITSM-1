import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function check() {
  try {
    // Run migration
    console.log('Running migration...');
    await sql`
      CREATE TABLE IF NOT EXISTS ip_addresses (
        id TEXT PRIMARY KEY,
        ip_address TEXT UNIQUE NOT NULL,
        subnet_mask TEXT DEFAULT '255.255.255.0',
        gateway TEXT,
        vlan TEXT,
        status TEXT DEFAULT 'Available',
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Migration done.');

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    
    if (tables.some(t => t.table_name === 'ip_addresses')) {
      console.log('✅ ip_addresses table exists.');
      const countResult = await sql`SELECT COUNT(*) FROM ip_addresses`;
      console.log('Current IP count:', countResult[0].count);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
