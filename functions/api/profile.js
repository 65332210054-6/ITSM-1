import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { validateSession } from '../auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const userSession = await validateSession(context);
    if (!userSession) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    const { id, name, email, password, avatar_url } = await request.json();
    
    // Security: Only allow updating own profile unless admin
    if (id !== userSession.user_id && userSession.role_name !== "Admin") {
      return new Response(JSON.stringify({ message: "Forbidden: You can only update your own profile" }), { status: 403 });
    }

    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ message: "Database connection error" }), { status: 500 });
    }

    const sql = neon(databaseUrl);
    
    let updateQuery;
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users 
        SET name = ${name}, email = ${email}, password = ${hashedPassword}, avatar_url = ${avatar_url}, updated_at = NOW() 
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE users 
        SET name = ${name}, email = ${email}, avatar_url = ${avatar_url}, updated_at = NOW() 
        WHERE id = ${id}
      `;
    }

    // Fetch updated user info
    const updatedUsers = await sql`
      SELECT u.id, u.name, u.email, u.avatar_url, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
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
        avatar_url: user.avatar_url
      }
    }), { 
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (error) {
    console.error("Profile API Error:", error);
    return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
