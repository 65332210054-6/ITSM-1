import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function check() {
    console.log('--- ALL MODULE SETTINGS ---');
    const settings = await sql`SELECT * FROM system_settings WHERE setting_key LIKE 'module_%'`;
    console.table(settings);
    
    console.log('--- USER ROLES ---');
    const roles = await sql`SELECT id, name FROM roles`;
    console.table(roles);

    console.log('--- ADMIN USER ---');
    const admin = await sql`SELECT u.name, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = 'user1@example.com' OR u.name = 'Admin' LIMIT 1`;
    console.log(admin);
}

check();
