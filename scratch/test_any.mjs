import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
    const roles = ['Visitor', 'User'];
    const res = await sql`SELECT id, name FROM roles WHERE name = ANY(${roles})`;
    console.log('Result:', res);
}
test().catch(console.error);
