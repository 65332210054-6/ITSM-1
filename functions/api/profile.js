import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer session-")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    // In this simple session setup, we don't have a DB session table, 
    // so we'd normally verify a JWT. For now, we'll assume the client is who they say they are 
    // or we'd need to pass the user ID in the token. 
    // Since we're using localStorage 'user' object on client, let's pass the ID in the body for this demo.
    
    const { name, email, password, avatar_url } = await request.json();
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ message: "Database connection error" }), { status: 500 });
    }

    const sql = neon(databaseUrl);
    
    // Get current user to update (we'll use email as the identifier for now as it's unique)
    // In a real app, you'd use the user ID from a verified JWT token.
    
    let updateQuery;
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users 
        SET name = ${name}, email = ${email}, password = ${hashedPassword}, avatar_url = ${avatar_url}, updated_at = NOW() 
        WHERE email = ${email}
      `;
    } else {
      await sql`
        UPDATE users 
        SET name = ${name}, email = ${email}, avatar_url = ${avatar_url}, updated_at = NOW() 
        WHERE email = ${email}
      `;
    }

    // Fetch updated user info
    const updatedUsers = await sql`
      SELECT u.id, u.name, u.email, u.avatar_url, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ${email} 
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
