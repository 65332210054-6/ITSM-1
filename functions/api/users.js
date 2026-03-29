import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    // Basic Auth Check
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer session-")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { 
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    const sql = neon(databaseUrl);
    
    // GET Users list and options
    if (request.method === "GET") {
      const url = new URL(request.url);
      const action = url.searchParams.get("action");

      if (action === "getOptions") {
        const roles = await sql`SELECT id, name FROM roles ORDER BY name`;
        const departments = await sql`SELECT id, name FROM departments ORDER BY name`;
        return new Response(JSON.stringify({ roles, departments }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const users = await sql`
        SELECT u.id, u.name, u.email, u.role_id, u.department_id, r.name as role_name, d.name as department_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN departments d ON u.department_id = d.id 
        ORDER BY u.created_at DESC
      `;
      
      return new Response(JSON.stringify(users), { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    // POST Operations
    if (request.method === "POST") {
      const url = new URL(request.url);
      const action = url.searchParams.get("action");
      const data = await request.json();

      // 1. Create Single User
      if (action === "create") {
        const { name, email, role_id, department_id, password } = data;
        
        // Check if user exists
        const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
        if (existing.length > 0) {
          return new Response(JSON.stringify({ message: "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" }), { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await sql`
          INSERT INTO users (name, email, role_id, department_id, password, created_at, updated_at, login_attempts, lock_until, avatar_url)
          VALUES (${name}, ${email}, ${role_id}, ${department_id || null}, ${hashedPassword}, NOW(), NOW(), 0, NULL, NULL)
        `;

        return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201 });
      }

      // 2. Bulk Create (Import)
      if (action === "bulkCreate") {
        const usersToImport = data;
        
        // Load roles and depts for mapping names to IDs
        const roles = await sql`SELECT id, name FROM roles`;
        const depts = await sql`SELECT id, name FROM departments`;
        
        const roleMap = Object.fromEntries(roles.map(r => [r.name.toLowerCase(), r.id]));
        const deptMap = Object.fromEntries(depts.map(d => [d.name.toLowerCase(), d.id]));
        const defaultRoleId = roleMap['user'] || (roles.length > 0 ? roles[0].id : null);

        let successCount = 0;
        for (const u of usersToImport) {
          try {
            if (!u.name || !u.email || !u.password) continue;

            // Check if user exists
            const existing = await sql`SELECT id FROM users WHERE email = ${u.email} LIMIT 1`;
            if (existing.length > 0) continue;

            const hashedPassword = await bcrypt.hash(u.password, 10);
            const roleId = roleMap[(u.role || '').toLowerCase()] || defaultRoleId;
            const deptId = deptMap[(u.department || '').toLowerCase()] || null;

            await sql`
              INSERT INTO users (name, email, role_id, department_id, password, created_at, updated_at, login_attempts, lock_until, avatar_url)
              VALUES (${u.name}, ${u.email}, ${roleId}, ${deptId}, ${hashedPassword}, NOW(), NOW(), 0, NULL, NULL)
            `;
            successCount++;
          } catch (err) {
            console.error(`Error importing user ${u.email}:`, err);
          }
        }

        return new Response(JSON.stringify({ message: `Imported ${successCount} users`, count: successCount }), { status: 200 });
      }

      // 3. Update User (Default POST)
      const { id, name, email, role_id, department_id } = data;
      
      if (!id) {
        return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
      }

      await sql`
        UPDATE users 
        SET name = ${name}, email = ${email}, role_id = ${role_id}, department_id = ${department_id || null}, updated_at = NOW() 
        WHERE id = ${id}
      `;

      return new Response(JSON.stringify({ message: "User updated successfully" }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { 
      status: 405,
      headers: { 
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดภายในระบบ" }), { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
}