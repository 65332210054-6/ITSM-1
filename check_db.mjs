import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

async function check() {
  try {
    const assets = await sql`SELECT COUNT(*) FROM assets`;
    const users = await sql`SELECT COUNT(*) FROM users`;
    const tickets = await sql`SELECT COUNT(*) FROM tickets`;
    
    console.log("Database Stats:");
    console.log("- Assets:", assets[0].count);
    console.log("- Users:", users[0].count);
    console.log("- Tickets:", tickets[0].count);

    if (assets[0].count > 0) {
      const sample = await sql`SELECT * FROM assets LIMIT 1`;
      console.log("\nSample Asset:", sample[0]);
    }

    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

check();
