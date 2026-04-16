import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
const databaseUrl = dbUrlMatch ? dbUrlMatch[1].trim().replace(/^"|"$/g, '') : null;

if (!databaseUrl) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
}

const sql = neon(databaseUrl);

async function testFullQuery() {
    try {
      const search = "";
      const roleId = "";
      const branchId = "";
      const deptId = "";
      const status = "";
      
      const startNum = 1;
      const endNum = 10;
      const offset = Math.max(0, startNum - 1);
      const limit = Math.max(1, endNum - startNum + 1);
      
      console.log(`Params: offset=${offset}, limit=${limit}`);

      const searchPattern = search ? `%${search}%` : "";

      console.log("Running main query...");
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
      console.log("Success! Users found:", users.length);

    } catch (e) {
      console.error("FAILED!", e);
    }
}

testFullQuery();
