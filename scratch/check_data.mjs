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

async function checkData() {
    try {
        console.log("Checking for active sessions...");
        const sess = await sql`SELECT id, user_id, expires_at FROM sessions ORDER BY created_at DESC LIMIT 5`;
        console.log("Recent sessions:", sess);

        console.log("Checking for roles...");
        const roles = await sql`SELECT id, name FROM roles`;
        console.log("Roles:", roles);

        console.log("Checking for one Admin user...");
        const admins = await sql`SELECT u.id, u.name, r.name as role_name 
                                  FROM users u 
                                  JOIN roles r ON u.role_id = r.id 
                                  WHERE r.name = 'Admin' LIMIT 1`;
        console.log("Admin sample:", admins);

    } catch (e) {
        console.error("Data check failed:", e);
    }
}

checkData();
