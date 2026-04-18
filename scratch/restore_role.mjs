import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function restore() {
    const id = '03697e3d-e631-4e44-83cf-0fa77a8cfd81';
    console.log(`Restoring role ID: ${id}`);
    
    try {
        await sql`
            INSERT INTO roles (id, name)
            VALUES (${id}, 'AAA')
            ON CONFLICT (id) DO UPDATE SET name = 'AAA'
        `;
        console.log('SUCCESS: Role AAA restored.');
    } catch (err) {
        console.error('ERROR during SQL restore:', err);
    }
}

restore();
