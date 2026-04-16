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

async function stressTest() {
    const searchPattern = "";
    const roleId = "";
    const branchId = "";
    const deptId = "";
    const status = "";
    const limit = 10;
    const offset = 0;

    console.log("Starting 5 iterations to test for hangs/intermittent failures...");
    for (let i = 1; i <= 5; i++) {
        try {
            console.time(`Iteration ${i}`);
            const result = await sql`
                SELECT u.id, u.name, u.email, u.status, r.name as role_name 
                FROM users u 
                LEFT JOIN roles r ON u.role_id = r.id 
                WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
                  AND (${roleId} = '' OR u.role_id::text = ${roleId})
                ORDER BY u.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
            console.timeEnd(`Iteration ${i}`);
            console.log(`- Success: Fetched ${result.length} users.`);
        } catch (e) {
            console.error(`- FAILED on iteration ${i}:`, e.message);
        }
    }
}

stressTest();
