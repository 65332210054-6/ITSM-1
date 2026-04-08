import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

const res = await sql`SELECT 1 as test`;
console.log("DB Test:", res);

const assets = await sql`SELECT COUNT(*) FROM assets`;
console.log("Assets count:", assets[0].count);

process.exit(0);
