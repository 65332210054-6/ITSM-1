import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function test() {
    const page = 1;
    const limit = 10;
    const search = '';
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Simulate the logic in users.js
    if (search) {
        whereClauses.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
        console.log("Testing Count Query...");
        const countResult = await sql(`SELECT COUNT(*) as total FROM users u ${whereSql}`, params);
        console.log("Count Success:", countResult);

        console.log("Testing List Query...");
        const users = await sql(`
            SELECT u.id, u.name, u.email, u.role_id, u.branch_id, u.department_id, u.status, r.name as role_name, b.name as branch_name, d.name as department_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id 
            ${whereSql}
            ORDER BY u.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, params);
        console.log("List Success! Count:", users.length);
    } catch (err) {
        console.error("QUERY ERROR:", err);
    }
}

test();
