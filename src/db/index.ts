import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.warn("Warning: DATABASE_URL is not set. This might be expected during build time on Cloudflare Pages.");
}

const sql = neon(databaseUrl || "postgres://localhost/placeholder");
export const db = drizzle(sql);
