import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.warn("Warning: DATABASE_URL is not set. Using a placeholder for build time.");
}

// neon() requires a valid-looking postgresql URL even if it's not used
const sql = neon(databaseUrl || "postgresql://db_user:db_pass@db_host.neon.tech/neondb");
export const db = drizzle(sql);
