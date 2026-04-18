import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function testQuery() {
    const searchPattern = "";
    try {
        const assets = await sql`
        SELECT a.id, a.asset_tag, a.serial_number, a.name, a.category, a.model, a.status, a.assigned_to, a.department_id, a.purchase_date, a.created_at,
               u.name as assigned_to_name, d.name as department_name
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE (${searchPattern} = '' OR 
               a.asset_tag ILIKE ${searchPattern} OR 
               a.serial_number ILIKE ${searchPattern} OR 
               a.name ILIKE ${searchPattern} OR
               a.model ILIKE ${searchPattern} OR
               a.category ILIKE ${searchPattern} OR
               u.name ILIKE ${searchPattern} OR
               d.name ILIKE ${searchPattern}
        )
        ORDER BY a.created_at DESC
        LIMIT 10
        OFFSET 0
      `;
        console.log(`Assets count: ${assets.length}`);
        if(assets.length > 0) console.log(assets[0]);
    } catch(err) {
        console.error(err);
    }
}
testQuery();
