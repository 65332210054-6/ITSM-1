import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function grantAll() {
    console.log('Granting Visitor access to ALL modules...');
    const modules = ['users', 'assets', 'tickets', 'borrows', 'domains', 'cartridges', 'licenses', 'reports', 'categories'];
    
    for (const m of modules) {
        const key = `module_${m}_roles_view`;
        const val = 'Admin,Technician,User,Visitor';
        await sql`
            INSERT INTO system_settings (setting_key, setting_value, updated_at) 
            VALUES (${key}, ${val}, NOW()) 
            ON CONFLICT (setting_key) DO UPDATE 
            SET setting_value = ${val}, updated_at = NOW()
        `;
    }
    
    console.log('Done!');
}

grantAll().catch(console.error);
