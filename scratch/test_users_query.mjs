import { neon } from '@neondatabase/serverless';
import { validateSession, checkModuleAccess } from '../auth.js';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testUsersAPI() {
    console.log('Testing /api/users logic directly...');
    
    // Simulate context
    const context = {
        request: {
            method: 'GET',
            headers: new Map([
                ['Authorization', 'Bearer session-token-placeholder'] // We won't use real token, we'll mock validateSession if needed, or just test the DB query
            ]),
            url: 'http://localhost/api/users'
        },
        env: {
            DATABASE_URL
        }
    };

    const sql = neon(DATABASE_URL);

    try {
        console.log('Fetching users from DB exactly as in users.js...');
        const users = await sql`
            SELECT 
                u.id, u.name, u.email, u.status, u.created_at,
                r.name as role_name,
                d.name as department_name,
                b.name as branch_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN branches b ON d.branch_id = b.id
            ORDER BY u.created_at DESC
        `;
        console.log(`Found ${users.length} users. First user:`, users[0]);
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

testUsersAPI();
