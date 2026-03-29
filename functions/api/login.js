import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const { email, password } = await request.json();
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
    }

    const sql = neon(databaseUrl);
    const users = await sql`
      SELECT u.id, u.name, u.email, u.password, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ${email} 
      LIMIT 1
    `;

    const user = users[0];

    // Note: Simple check for now
    if (user && user.password === password) {
      return new Response(JSON.stringify({ 
        token: "session-" + Math.random().toString(36).substr(2),
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email,
          role: user.role_name 
        }
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ message: "Server Error", error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}