import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const { email, password } = await request.json();
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      console.error("DATABASE_URL is not set");
      return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล" }), { status: 500 });
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

    // Secure password check using bcrypt
    const isPasswordValid = user && await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
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

    return new Response(JSON.stringify({ message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดภายในระบบ" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}