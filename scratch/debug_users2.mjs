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

async function testQuery() {
    try {
      const searchPattern = "";
      const roleId = "";
      const branchId = "";
      const deptId = "";
      const status = "";

      console.log("Running stats result...");
      const statsResult = await sql`
        SELECT r.name as role_name, COUNT(*)::int as count
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          AND (${roleId} = '' OR u.role_id::text = ${roleId})
          AND (${branchId} = '' OR u.branch_id::text = ${branchId})
          AND (${deptId} = '' OR u.department_id::text = ${deptId})
          AND (${status} = '' OR u.status = ${status})
        GROUP BY r.name
      `;
      console.log("StatsResult:", statsResult);
    } catch (e) {
      console.error("Error executing stats query:", e);
    }
}

testQuery();
