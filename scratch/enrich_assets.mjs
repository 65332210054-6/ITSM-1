import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function enrich() {
  console.log("Enriching assets for reporting...");

  const categories = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Server', 'Network', 'Mobile'];
  
  for (const cat of categories) {
    const exists = await sql`SELECT 1 FROM asset_categories WHERE name = ${cat}`;
    if (exists.length === 0) {
      await sql`INSERT INTO asset_categories (id, name) VALUES (${crypto.randomUUID()}, ${cat})`;
    }
  }

  // Add some assets if count is low
  const assetCount = await sql`SELECT COUNT(*)::int as count FROM assets`;
  if (assetCount[0].count < 10) {
    const sampleAssets = [
      { asset_tag: 'IT-001', name: 'MacBook Pro 14', category: 'Laptop', status: 'Available' },
      { asset_tag: 'IT-002', name: 'Dell UltraSharp 27', category: 'Monitor', status: 'In Use' },
      { asset_tag: 'IT-003', name: 'HP LaserJet Pro', category: 'Printer', status: 'Available' },
      { asset_tag: 'IT-004', name: 'Cisco C9200L', category: 'Network', status: 'In Use' },
      { asset_tag: 'IT-005', name: 'iPhone 15 Pro', category: 'Mobile', status: 'In Use' }
    ];
    for (const a of sampleAssets) {
        await sql`
          INSERT INTO assets (id, asset_tag, name, category, status) 
          VALUES (${crypto.randomUUID()}, ${a.asset_tag}, ${a.name}, ${a.category}, ${a.status})
          ON CONFLICT (asset_tag) DO NOTHING
        `;
    }
  }

  console.log("Done!");
}

enrich();
