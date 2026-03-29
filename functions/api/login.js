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
      SELECT u.id, u.name, u.email, u.password, u.avatar_url, u.login_attempts, u.lock_until, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ${email} 
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return new Response(JSON.stringify({ message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return new Response(JSON.stringify({ 
        message: `บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${remainingMinutes} นาที` 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Secure password check using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // Reset login attempts on success
      await sql`UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ${user.id}`;

      return new Response(JSON.stringify({ 
        token: "session-" + Math.random().toString(36).substr(2),
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email,
          role: user.role_name,
          avatar_url: user.avatar_url
        }
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Handle failed login attempt
    const newAttempts = (user.login_attempts || 0) + 1;
    let lockUntil = null;
    let message = "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";

    if (newAttempts >= 5) {
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + 15); // Lock for 15 minutes
      lockUntil = lockTime;
      message = "คุณใส่รหัสผ่านผิดเกิน 5 ครั้ง บัญชีถูกระงับการเข้าใช้งานชั่วคราว 15 นาที";
    }

    await sql`UPDATE users SET login_attempts = ${newAttempts}, lock_until = ${lockUntil} WHERE id = ${user.id}`;

    return new Response(JSON.stringify({ message }), { 
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