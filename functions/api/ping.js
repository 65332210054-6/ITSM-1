import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { env } = context;
  const sql = neon(env.DATABASE_URL);
  
  try {
      const result = await sql`SELECT 1 as connected`;
      return new Response(JSON.stringify({ 
          status: "success", 
          message: "Worker can reach DB", 
          result: result[0],
          timestamp: new Date().toISOString()
      }), { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
      });
  } catch (e) {
      return new Response(JSON.stringify({ 
          status: "error", 
          message: e.message 
      }), { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
      });
  }
}
