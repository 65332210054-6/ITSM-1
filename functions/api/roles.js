import { neon } from '@neondatabase/serverless';
import { validateSession } from '../auth.js';
import { logAction } from './logs.js';

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
    const url = new URL(request.url);
    const action = (url.searchParams.get("action") || "").toLowerCase().trim();

    // GET: List all roles
    if (request.method === "GET") {
      const roles = await sql`SELECT * FROM roles ORDER BY name ASC`;
      return new Response(JSON.stringify(roles), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Admin only for POST/PUT/DELETE
    if (userSession.role_name !== "Admin") {
      return new Response(JSON.stringify({ message: "Forbidden: Admin only" }), { status: 403 });
    }

    // Handle Delete Action
    if (action === "delete") {
      const id = url.searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });

      const roles = await sql`SELECT name FROM roles WHERE id = ${id}`;
      if (roles.length === 0) return new Response(JSON.stringify({ message: "ไม่พบบทบาทที่ต้องการลบ" }), { status: 404 });
      
      const roleName = roles[0].name;
      if (roleName === 'Admin') return new Response(JSON.stringify({ message: "ไม่สามารถลบบทบาท Admin ได้" }), { status: 400 });

      const inUse = await sql`SELECT COUNT(*)::int as count FROM users WHERE role_id = ${id}`;
      if (inUse[0].count > 0) {
        return new Response(JSON.stringify({ message: `บทบาทนี้ถูกใช้งานโดยผู้ใช้ ${inUse[0].count} ราย ไม่สามารถลบได้` }), { status: 400 });
      }

      await sql`DELETE FROM roles WHERE id = ${id}`;
      
      try {
        const allSettings = await sql`SELECT setting_key, setting_value FROM system_settings WHERE setting_value LIKE ${'%' + roleName + '%'}`;
        for (const s of allSettings) {
          let rolesList = s.setting_value.split(',').map(r => r.trim());
          if (rolesList.includes(roleName)) {
            rolesList = rolesList.filter(r => r !== roleName);
            const newVal = rolesList.join(',');
            await sql`UPDATE system_settings SET setting_value = ${newVal} WHERE setting_key = ${s.setting_key}`;
          }
        }
      } catch (e) {}

      await logAction(sql, userSession.user_id, 'Roles', 'Delete', { role_id: id, name: roleName });
      return new Response(JSON.stringify({ message: "ลบบทบาทสำเร็จ" }), { status: 200 });
    }

    // Create/Update Logic
    if (request.method === "POST" || request.method === "PUT") {
      let data = {};
      try {
        const text = await request.text();
        if (text && text.trim()) data = JSON.parse(text);
      } catch (err) {
        return new Response(JSON.stringify({ message: "Invalid JSON body" }), { status: 400 });
      }

      const { id, name } = data;
      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ message: "กรุณาระบุชื่อบทบาท" }), { status: 400 });
      }

      if (id) {
        const role = await sql`SELECT name FROM roles WHERE id = ${id}`;
        if (role.length > 0 && role[0].name === 'Admin') {
             return new Response(JSON.stringify({ message: "ไม่สามารถแก้ไขชื่อบทบาท Admin ได้" }), { status: 400 });
        }
        await sql`UPDATE roles SET name = ${name.trim()} WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Roles', 'Update', { role_id: id, name: name.trim() });
        return new Response(JSON.stringify({ message: "Updated successfully" }), { status: 200 });
      } else {
        const existing = await sql`SELECT id FROM roles WHERE name = ${name.trim()} LIMIT 1`;
        if (existing.length > 0) return new Response(JSON.stringify({ message: "บทบาทนี้มีอยู่แล้ว" }), { status: 400 });
        
        // Use crypto.randomUUID() safely (it's global in Workers)
        const newId = crypto.randomUUID();
        await sql`INSERT INTO roles (id, name) VALUES (${newId}, ${name.trim()})`;
        await logAction(sql, userSession.user_id, 'Roles', 'Create', { role_id: newId, name: name.trim() });
        return new Response(JSON.stringify({ message: "Created successfully" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Roles API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
