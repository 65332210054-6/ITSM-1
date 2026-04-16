import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { validateSession } from '../auth.js';

// Migration flag: runs once per cold start, not on every request
let _phoneMigrationDone = false;

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "Database connection error" }), { status: 500 });
  }

  try {
    const userSession = await validateSession(context);
    if (!userSession) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    const sql = neon(databaseUrl);

    // Run phone column migration only once per cold start
    if (!_phoneMigrationDone) {
      try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
        _phoneMigrationDone = true;
      } catch (_) { _phoneMigrationDone = true; } // Ignore if already exists
    }

    // --- GET PROFILE ---
    if (request.method === "GET") {
      const users = await sql`
        SELECT u.id, u.name, u.email, u.avatar_url, u.phone, r.name as role, b.name as branch_name, d.name as department_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ${userSession.user_id} 
        LIMIT 1
      `;
      if (users.length === 0) {
        return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
      }
      return new Response(JSON.stringify({ user: users[0] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // --- UPDATE PROFILE (POST) ---
    if (request.method === "POST") {
      const { id, name, email, password, avatar_url, phone } = await request.json();

      // Security: Only allow updating own profile unless admin
      if (id !== userSession.user_id && userSession.role_name !== "Admin") {
        return new Response(JSON.stringify({ message: "Forbidden: You can only update your own profile" }), { status: 403 });
      }

      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql`
          UPDATE users 
          SET name = ${name}, email = ${email}, password = ${hashedPassword}, avatar_url = ${avatar_url}, phone = ${phone || null}, updated_at = NOW() 
          WHERE id = ${id}
        `;
      } else {
        await sql`
          UPDATE users 
          SET name = ${name}, email = ${email}, avatar_url = ${avatar_url}, phone = ${phone || null}, updated_at = NOW() 
          WHERE id = ${id}
        `;
      }

      // Fetch updated user info
      const updatedUsers = await sql`
        SELECT u.id, u.name, u.email, u.avatar_url, u.phone, r.name as role_name, b.name as branch_name, d.name as department_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ${id} 
        LIMIT 1
      `;

      const user = updatedUsers[0];

      return new Response(JSON.stringify({ 
        message: "Profile updated successfully",
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
        headers: { 
          "Content-Type": "application/json",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Profile API Error:", error);
    return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
