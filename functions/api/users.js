import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { validateSession, checkModuleAccess } from '../auth.js';
import { logAction } from './logs.js';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const sql = neon(databaseUrl);

    // 1. Session & Access Control
    // Actions "getUsers" and "getOptions" are bypassable for general authenticated users (for dropdowns)
    let userSession = null;
    if (action === "getUsers" || action === "getOptions") {
      userSession = await validateSession(context, sql);
    } else {
      // Base check for 'view' access
      userSession = await checkModuleAccess(context, 'users', 'view', sql);
    }

    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: No access to User Management" }), { status: 403 });
    }

    // GET Users list and options
    if (request.method === "GET") {
      // Action: Export (Requires special check or defaults to view)
      if (action === "export") {
        if (!await checkModuleAccess(context, 'users', 'view', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
        }
        const users = await sql`
          SELECT u.id, u.name, u.email, r.name as role_name, b.name as branch_name, d.name as department_name, u.status, u.created_at
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          LEFT JOIN branches b ON u.branch_id = b.id
          LEFT JOIN departments d ON u.department_id = d.id 
          ORDER BY u.created_at DESC
        `;

        const csvHeader = "\ufeff" + ["ID", "ชื่อ-นามสกุล", "อีเมล", "บทบาท", "สาขา", "แผนก", "สถานะ", "วันที่สร้าง"].join(",") + "\n";
        const csvRows = users.map(u => {
          const row = [
            u.id,
            u.name || "-",
            u.email || "-",
            u.role_name || "User",
            u.branch_name || "-",
            u.department_name || "ไม่ระบุ",
            u.status === 'suspended' ? "หยุดใช้งานชั่วคราว" : (u.status === 'inactive' ? "ระงับการใช้งาน" : "ใช้งานปกติ"),
            u.created_at ? new Date(u.created_at).toLocaleDateString("th-TH") : "-"
          ];
          return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
        }).join("\n");

        return new Response(csvHeader + csvRows, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"it-users-list.csv\""
          }
        });
      }

      if (action === "getUsers") {
        const users = await sql`
          SELECT u.id, u.name, u.email, r.name as role_name, d.name as department_name
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.status = 'active' OR u.status IS NULL
          ORDER BY u.name ASC
        `;
        return new Response(JSON.stringify(users), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "getOptions") {
        const roles = await sql`SELECT id, name FROM roles ORDER BY name`;
        const branches = await sql`SELECT id, name FROM branches ORDER BY name`;
        const departments = await sql`SELECT id, name, branch_id FROM departments ORDER BY name`;
        return new Response(JSON.stringify({ roles, branches, departments }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Rest of GET is main list
      let limit = 10;
      let offset = 0;
      let startParam = url.searchParams.get("start");
      let endParam = url.searchParams.get("end");

      if (startParam && endParam) {
        const startNum = parseInt(startParam, 10);
        const endNum = parseInt(endParam, 10);
        offset = Math.max(0, startNum - 1);
        limit = Math.max(1, endNum - startNum + 1);
      }
      
      const search = url.searchParams.get("search") || "";
      const role_id = url.searchParams.get("role_id") || "";
      const branch_id = url.searchParams.get("branch_id") || "";
      const department_id = url.searchParams.get("department_id") || "";
      const status = url.searchParams.get("status") || "";
      const getStats = url.searchParams.get("get_stats") === 'true';

      const searchPattern = search ? `%${search}%` : "";

      const countResult = await sql`
        SELECT COUNT(*)::int as total
        FROM users u
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
        AND (${role_id} = '' OR u.role_id = ${role_id})
        AND (${branch_id} = '' OR u.branch_id = ${branch_id})
        AND (${department_id} = '' OR u.department_id = ${department_id})
        AND (${status} = '' OR u.status = ${status})
      `;

      const usersResult = await sql`
        SELECT u.id, u.name, u.email, u.status, u.created_at, u.login_attempts, u.lock_until,
               r.name as role_name, b.name as branch_name, d.name as department_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
        AND (${role_id} = '' OR u.role_id = ${role_id})
        AND (${branch_id} = '' OR u.branch_id = ${branch_id})
        AND (${department_id} = '' OR u.department_id = ${department_id})
        AND (${status} = '' OR u.status = ${status})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const totalCount = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalCount / limit);

      let roleStats = [];
      if (getStats) {
        roleStats = await sql`
            SELECT r.name, COUNT(u.id)::int as count 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            GROUP BY r.name
        `;
      }

      return new Response(JSON.stringify({ 
          users: usersResult, 
          totalCount, 
          totalPages,
          roleStats: getStats ? roleStats : undefined
      }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
      });
    }

    // POST Operations
    if (request.method === "POST") {
      // 1. Delete User
      if (action === "delete") {
        if (!await checkModuleAccess(context, 'users', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to delete" }), { status: 403 });
        }
        const id = url.searchParams.get("id");
        if (!id) {
          return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
        }

        await sql`DELETE FROM users WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Users', 'Delete', { target_id: id });
        return new Response(JSON.stringify({ message: "User deleted successfully" }), { status: 200 });
      }

      const data = await request.json();

      // 2. Create Single User
      if (action === "create") {
        if (!await checkModuleAccess(context, 'users', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create" }), { status: 403 });
        }
        const { name, email, role_id, branch_id, department_id, password } = data;
        
        const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
        if (existing.length > 0) {
          return new Response(JSON.stringify({ message: "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" }), { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = crypto.randomUUID();
        
        await sql`
          INSERT INTO users (id, name, email, role_id, branch_id, department_id, password, created_at, updated_at, login_attempts, lock_until, avatar_url)
          VALUES (${newId}, ${name}, ${email}, ${role_id}, ${branch_id || null}, ${department_id || null}, ${hashedPassword}, NOW(), NOW(), 0, NULL, NULL)
        `;

        await logAction(sql, userSession.user_id, 'Users', 'Create', { name, email, role_id });
        return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201 });
      }

      // 3. Bulk Create
      if (action === "bulkCreate") {
        if (!await checkModuleAccess(context, 'users', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create" }), { status: 403 });
        }
        // ... (rest of bulkCreate logic)
        const usersToImport = data;
        
        // Load roles, branches, and depts for mapping names to IDs
        const roles = await sql`SELECT id, name FROM roles`;
        const branches = await sql`SELECT id, name FROM branches`;
        const depts = await sql`SELECT id, name FROM departments`;
        
        const roleMap = Object.fromEntries(roles.map(r => [r.name.toLowerCase(), r.id]));
        const branchMap = Object.fromEntries(branches.map(b => [b.name.toLowerCase(), b.id]));
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
            const branchId = branchMap[(u.branch || '').toLowerCase()] || null;
            const deptId = deptMap[(u.department || '').toLowerCase()] || null;
            const newId = crypto.randomUUID();

            await sql`
              INSERT INTO users (id, name, email, role_id, branch_id, department_id, password, created_at, updated_at, login_attempts, lock_until, avatar_url)
              VALUES (${newId}, ${u.name}, ${u.email}, ${roleId}, ${branchId}, ${deptId}, ${hashedPassword}, NOW(), NOW(), 0, NULL, NULL)
            `;
            successCount++;
          } catch (err) {
            console.error(`Error importing user ${u.email}:`, err);
          }
        }

        return new Response(JSON.stringify({ message: `Imported ${successCount} users`, count: successCount }), { status: 200 });
      }


      // 4. Update User (Default POST if no specific action or action is update)
      const { id, name, email, role_id, branch_id, department_id, status } = data;
      
      if (!id) {
        return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
      }

      if (status === 'suspended') {
        await sql`
          UPDATE users 
          SET name = ${name}, email = ${email}, role_id = ${role_id}, branch_id = ${branch_id || null}, department_id = ${department_id || null}, status = ${status || 'active'}, lock_until = NOW() + INTERVAL '10 minutes', updated_at = NOW() 
          WHERE id = ${id}
        `;
      } else if (status === 'active') {
        await sql`
          UPDATE users 
          SET name = ${name}, email = ${email}, role_id = ${role_id}, branch_id = ${branch_id || null}, department_id = ${department_id || null}, status = ${status || 'active'}, lock_until = NULL, login_attempts = 0, updated_at = NOW() 
          WHERE id = ${id}
        `;
      } else {
        await sql`
          UPDATE users 
          SET name = ${name}, email = ${email}, role_id = ${role_id}, branch_id = ${branch_id || null}, department_id = ${department_id || null}, status = ${status || 'active'}, updated_at = NOW() 
          WHERE id = ${id}
        `;
      }

      await logAction(sql, userSession.user_id, 'Users', 'Update', { target_id: id, name, email, status });
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
    return new Response(JSON.stringify({ message: "เกิดข้อผิดพลาดภายในระบบ: " + error.message }), { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
}