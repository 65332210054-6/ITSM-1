import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function test() {
    const id = '03697e3d-e631-4e44-83cf-0fa77a8cfd81'; // The Role ID for "AAA"
    console.log(`Testing deletion of role ID: ${id}`);
    
    try {
        // 1. Check if it exists
        const role = await sql`SELECT * FROM roles WHERE id = ${id}`;
        console.log('Role found:', role);

        if (role.length === 0) {
            console.log('Role not found. Maybe it was already deleted?');
            return;
        }

        // 2. Check users using this role
        const users = await sql`SELECT COUNT(*) FROM users WHERE role_id = ${id}`;
        console.log('Users using this role:', users[0].count);

        // 3. Try to delete it directly via SQL
        console.log('Attempting direct SQL delete...');
        await sql`DELETE FROM roles WHERE id = ${id}`;
        console.log('SUCCESS: Role deleted from DB.');

    } catch (err) {
        console.error('ERROR during SQL test:', err);
    }
}

test();
