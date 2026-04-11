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

async function backfill() {
    try {
        console.log("Backfilling Branches...");
        const branches = await sql`SELECT id, name FROM branches ORDER BY created_at ASC`;
        let branchCounter = 1;
        for (const b of branches) {
            const code = String(branchCounter).padStart(3, '0');
            await sql`UPDATE branches SET code = ${code} WHERE id = ${b.id}`;
            console.log(`- Updated Branch: ${b.name} -> ${code}`);
            branchCounter++;
        }

        console.log("Backfilling Departments...");
        const depts = await sql`SELECT id, name FROM departments ORDER BY created_at ASC`;
        let deptCounter = 1;
        for (const d of depts) {
            const code = String(deptCounter).padStart(3, '0');
            await sql`UPDATE departments SET code = ${code} WHERE id = ${d.id}`;
            console.log(`- Updated Dept: ${d.name} -> ${code}`);
            deptCounter++;
        }

        console.log("Backfill Complete!");
    } catch(err) {
        console.error("Error during backfill:", err);
    }
}
backfill();
