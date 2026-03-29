import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const sql = neon(databaseUrl);
    
    if (request.method === "GET") {
      const departments = await sql`
        SELECT d.*, b.name as branch_name 
        FROM departments d 
        LEFT JOIN branches b ON d.branch_id = b.id 
        ORDER BY d.name ASC
      `;
      return new Response(JSON.stringify(departments), { 
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