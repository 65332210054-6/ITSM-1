import { neon } from '@neondatabase/serverless';
import fs from 'fs';

// Read .env manually
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL=["']?(.+?)["']?(\s|$)/);
const databaseUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

async function checkSettings() {
    if (!databaseUrl) {
        console.error("DATABASE_URL not found in .env");
        return;
    }
    const sql = neon(databaseUrl);
    try {
        const settings = await sql`SELECT * FROM system_settings`;
        console.log("System Settings:");
        settings.forEach(s => {
            console.log(`${s.setting_key}: ${s.setting_value}`);
        });
    } catch (e) {
        console.error("Error fetching settings:", e.message);
    }
}

checkSettings();
