import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Migration flag: runs once per cold start
let _phoneMigrationDone = false;

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

    // Ensure sessions table exists (Migration)
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // Auto-cleanup expired suspensions globally
    await sql`UPDATE users SET status = 'active', lock_until = NULL WHERE status = 'suspended' AND lock_until <= NOW()`;

    // Run phone column migration only once per cold start
    if (!_phoneMigrationDone) {
      try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
        _phoneMigrationDone = true;
      } catch (_) { _phoneMigrationDone = true; }
    }

    const users = await sql`
      SELECT u.id, u.name, u.email, u.password, u.avatar_url, u.phone, u.login_attempts, u.lock_until, u.status, 
             r.name as role_name, b.name as branch_name, d.name as department_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON u.department_id = d.id
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

    // Check custom statuses
    if (user.status === 'inactive') {
      return new Response(JSON.stringify({ 
        message: "บัญชีของคุณถูกระงับการใช้งาน ไม่สามารถเข้าระบบได้ กรุณาติดต่อฝ่าย IT" 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (user.status === 'suspended') {
      const remainingMinutes = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return new Response(JSON.stringify({ 
        message: `บัญชีถูกหยุดใช้งานชั่วคราว กรุณารออีก ${remainingMinutes} นาทีแล้วลองใหม่` 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if account is locked due to wrong password attempts
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return new Response(JSON.stringify({ 
        message: `บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${remainingMinutes} นาที` 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Secure password check (supports both plain text migration and bcrypt)
    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = (password === user.password);
    }

    if (isPasswordValid) {
      await sql`UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ${user.id}`;
      const token = "session-" + crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await sql`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (${token}, ${user.id}, ${expiresAt})
      `;

      return new Response(JSON.stringify({ 
        token,
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email,
          role: user.role_name,
          avatar_url: user.avatar_url,
          phone: user.phone,
          branch_name: user.branch_name,
          department_name: user.department_name
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