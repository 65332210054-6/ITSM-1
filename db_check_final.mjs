import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

try {
    const users = await sql`SELECT COUNT(*) FROM users`;
    console.log('Users count:', users[0].count);
    
    const assets = await sql`SELECT COUNT(*) FROM assets`;
    console.log('Assets count:', assets[0].count);

    const tickets = await sql`SELECT COUNT(*) FROM tickets`;
    console.log('Tickets count:', tickets[0].count);

    if (assets[0].count > 0) {
        const rows = await sql`SELECT * FROM assets LIMIT 5`;
        console.log('Sample assets:', rows);
    }
} catch (e) {
    console.error('DB Error:', e);
}
process.exit(0);
