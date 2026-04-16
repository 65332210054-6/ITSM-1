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

async function checkSchema() {
    try {
        console.log("Fetching table columns for users and roles...");
        const columns = await sql`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'roles')
        `;
        console.table(columns);

        console.log("Checking role ID types...");
        const roleIds = await sql`SELECT id FROM roles LIMIT 1`;
        if (roleIds.length > 0) {
            console.log("Sample role ID:", roleIds[0].id, "Type:", typeof roleIds[0].id);
        }

    } catch (e) {
        console.error("Schema check failed:", e);
    }
}

checkSchema();
