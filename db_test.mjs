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

async function main() {
    try {
        // Change is_active to status varchar
        await sql`ALTER TABLE users RENAME COLUMN is_active TO status`;
        await sql`ALTER TABLE users ALTER COLUMN status DROP DEFAULT`;
        await sql`ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(20) USING (CASE WHEN status=true THEN 'active' ELSE 'inactive' END)`;
        await sql`ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'`;
        
        console.log("Changed is_active to status column.");
    } catch(err) {
        console.error(err);
    }
}
main();
