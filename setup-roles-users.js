const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const databaseUrl = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
    const sql = neon(databaseUrl);
    const password = 'Jo@0804177633';
    const hash = bcrypt.hashSync(password, 10);
    
    try {
        console.log('--- Managing Roles ---');
        // 1. Add Visitor Role
        await sql`INSERT INTO roles (id, name, description) 
                  VALUES ('role-visitor-id', 'Visitor', 'Read-only Access')
                  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`;
        console.log('Role: Visitor added/updated');

        console.log('--- Creating Users for each Role ---');
        
        // 2. Clear old test users if any (optional, but good for clean state)
        // Keep the main 'admin' user but update if needed
        
        const users = [
            { id: 'user-admin-id', email: 'admin', name: 'Administrator', role: 'Admin' },
            { id: 'user-tech-id', email: 'tech', name: 'IT Technician', role: 'Technician' },
            { id: 'user-staff-id', email: 'user', name: 'General Staff', role: 'User' },
            { id: 'user-visitor-id', email: 'visitor', name: 'Visitor Guest', role: 'Visitor' }
        ];

        for (const u of users) {
            const roles = await sql`SELECT id FROM roles WHERE name = ${u.role} LIMIT 1`;
            if (roles.length > 0) {
                const roleId = roles[0].id;
                await sql`INSERT INTO users (id, email, password, name, role_id, created_at, updated_at)
                          VALUES (${u.id}, ${u.email}, ${hash}, ${u.name}, ${roleId}, NOW(), NOW())
                          ON CONFLICT (email) DO UPDATE 
                          SET password = EXCLUDED.password, name = EXCLUDED.name, role_id = EXCLUDED.role_id, updated_at = NOW()`;
                console.log(`User: ${u.email} (${u.role}) created/updated`);
            }
        }

        console.log('--- Database Task Completed ---');
    } catch (err) {
        console.error('Database operation failed:', err);
    }
}

run();
