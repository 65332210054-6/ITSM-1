import { neon } from '@neondatabase/serverless';
import { validateSession } from '../auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const userSession = await validateSession(context);
    if (!userSession) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    const sql = neon(databaseUrl);
    
    if (request.method === "GET") {
      const branches = await sql`SELECT * FROM branches ORDER BY name ASC`;
      return new Response(JSON.stringify(branches), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    return new Response(JSON.stringify({ message: "Server Error", error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}