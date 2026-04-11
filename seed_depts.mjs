import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/['"]/g, '');

const sql = neon(dbUrl);

const deptsToAdd = [
    "ฝ่ายบุคคล (HR)",
    "ฝ่ายบัญชีและการเงิน (Finance & Accounting)",
    "ฝ่ายขาย (Sales)",
    "ฝ่ายการตลาด (Marketing)",
    "ฝ่ายปฏิบัติการ (Operations)",
    "ฝ่ายจัดซื้อ (Purchasing)",
    "ฝ่ายธุรการ (Administration)",
    "ผู้บริหาร (Executive)"
];

async function seed() {
    try {
        const branches = await sql`SELECT id FROM branches LIMIT 1`;
        const branchId = branches.length > 0 ? branches[0].id : null;

        const maxCodeRows = await sql`
            SELECT code FROM departments 
            WHERE code ~ '^[0-9]+$' 
            ORDER BY CAST(code AS INTEGER) DESC LIMIT 1
        `;
        let nextCodeNum = 1;
        if (maxCodeRows.length > 0 && maxCodeRows[0].code) {
            nextCodeNum = parseInt(maxCodeRows[0].code, 10) + 1;
        }

        for (const dept of deptsToAdd) {
            const newId = crypto.randomUUID();
            const newCode = String(nextCodeNum).padStart(3, '0');
            await sql`
                INSERT INTO departments (id, code, name, branch_id, created_at, updated_at)
                VALUES (${newId}, ${newCode}, ${dept}, ${branchId}, NOW(), NOW())
            `;
            console.log(`Added Dept: ${newCode} - ${dept}`);
            nextCodeNum++;
        }

        console.log("Seed Complete!");
    } catch(err) {
        console.error("Error during seed:", err);
    }
}
seed();
