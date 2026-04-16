import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const sql = neon(databaseUrl);

async function testQuery() {
    try {
      const searchPattern = "";
      const roleId = "";
      const branchId = "";
      const deptId = "";
      const status = "";
      let limit = 10;
      let offset = 0;

      console.log("Running count...");
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM users u
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          AND (${roleId} = '' OR u.role_id::text = ${roleId})
          AND (${branchId} = '' OR u.branch_id::text = ${branchId})
          AND (${deptId} = '' OR u.department_id::text = ${deptId})
          AND (${status} = '' OR u.status = ${status})
      `;
      console.log("Count:", countResult[0].total);

      console.log("Running select...");
      const users = await sql`
        SELECT u.id, u.name, u.email, u.role_id, u.branch_id, u.department_id, u.status, r.name as role_name, b.name as branch_name, d.name as department_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN departments d ON u.department_id = d.id 
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          AND (${roleId} = '' OR u.role_id::text = ${roleId})
          AND (${branchId} = '' OR u.branch_id::text = ${branchId})
          AND (${deptId} = '' OR u.department_id::text = ${deptId})
          AND (${status} = '' OR u.status = ${status})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      console.log("Users returned:", users.length);
      console.log("First user:", users[0]);
    } catch (e) {
      console.error(e);
    }
}

testQuery();
