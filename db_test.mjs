import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/['"]/g, '');

const sql = neon(dbUrl);

async function check() {
    try {
        const result = await sql`
            SELECT column_name, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'departments';
        `;
        console.log("Departments Table Structure:");
        console.table(result);
    } catch(err) {
        console.error(err);
    }
}
check();
