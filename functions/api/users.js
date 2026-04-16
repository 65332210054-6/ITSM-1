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

    // Secure Auth Check
    const userSession = await checkModuleAccess(context, 'module_users_enabled', sql);
    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: You do not have access to the Users module" }), { status: 403 });
    }
    
    // Admin Only Check for Write Operations
    if (request.method === "POST" && userSession.role_name !== "Admin") {
      return new Response(JSON.stringify({ message: "Forbidden: Admin role required" }), { status: 403 });
    }
    
    // GET Users list and options
    if (request.method === "GET") {
      if (action === "export") {
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

      if (action === "getOptions") {
        const roles = await sql`SELECT id, name FROM roles ORDER BY name`;
        const branches = await sql`SELECT id, name FROM branches ORDER BY name`;
        const departments = await sql`SELECT id, name, branch_id FROM departments ORDER BY name`;
        return new Response(JSON.stringify({ roles, branches, departments }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Auto-cleanup expired suspensions globally
      await sql`UPDATE users SET status = 'active', lock_until = NULL WHERE status = 'suspended' AND lock_until <= NOW()`;

      // Pagination & Search logic
      let limit = 10;
      let offset = 0;
      let page = 1;
      let startParam = url.searchParams.get("start");
      let endParam = url.searchParams.get("end");

      if (startParam && endParam) {
        const startNum = parseInt(startParam, 10) || 1;
        const endNum = parseInt(endParam, 10) || 10;
        offset = Math.max(0, startNum - 1);
        limit = Math.max(1, endNum - startNum + 1);
        page = Math.floor(offset / limit) + 1;
      } else {
        page = parseInt(url.searchParams.get("page") || "1", 10) || 1;
        limit = parseInt(url.searchParams.get("limit") || "10", 10) || 10;
        offset = (page - 1) * limit;
      }

      // Ensure they are strict numbers for the SQL tag
      limit = Number(limit);
      offset = Number(offset);
      
      const search = url.searchParams.get("search") || "";
      const roleId = url.searchParams.get("role_id") || "";
      const branchId = url.searchParams.get("branch_id") || "";
      const deptId = url.searchParams.get("department_id") || "";
      const status = url.searchParams.get("status") || "";

      const searchPattern = search ? `%${search}%` : "";

      // Optimized query using the "optional param" pattern to keep SQL static
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM users u
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          AND (${roleId} = '' OR u.role_id::text = ${roleId})
          AND (${branchId} = '' OR u.branch_id::text = ${branchId})
          AND (${deptId} = '' OR u.department_id::text = ${deptId})
          AND (${status} = '' OR u.status = ${status})
      `;
      const totalCount = parseInt(countResult[0]?.total || "0", 10);

      const users = await sql`
        SELECT u.id, u.name, u.email, u.role_id, u.branch_id, u.department_id, u.status, r.name as role_name, b.name as branch_name, d.name as department_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN departments d ON u.department_id = d.id 
        WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          AND (${roleId} = '' OR u.role_id::text = ${roleId})
          AND (${branchId} = '' OR u.branch_id::text = ${branchId})
          AND (${deptId} = '' OR u.department_id::text = ${deptId})
          AND (${status} = '' OR u.status = ${status})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      // Role Stats calculation (Conditional)
      const getStats = url.searchParams.get("get_stats") === "true";
      let roleStats = null;
      if (getStats) {
        const statsResult = await sql`
          SELECT r.name as role_name, COUNT(*)::int as count
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          WHERE (${searchPattern} = '' OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
            AND (${roleId} = '' OR u.role_id::text = ${roleId})
            AND (${branchId} = '' OR u.branch_id::text = ${branchId})
            AND (${deptId} = '' OR u.department_id::text = ${deptId})
            AND (${status} = '' OR u.status = ${status})
          GROUP BY r.name
        `;
        roleStats = {};
        statsResult.forEach(row => {
          roleStats[row.role_name || 'User'] = row.count;
        });
      }

      return new Response(JSON.stringify({
        users,
        page,
        limit,
        start: offset + 1,
        end: offset + limit,
        totalCount: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
        roleStats
      }), { 
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
      // 1. Delete User (Doesn't require body)
      if (action === "delete") {
        const id = url.searchParams.get("id");
        if (!id) {
          return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
        }

        await sql`DELETE FROM users WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Users', 'Delete', { target_id: id });
        return new Response(JSON.stringify({ message: "User deleted successfully" }), { status: 200 });
      }

      // Other actions require JSON body
      const data = await request.json();

      // 1. Create Single User
      if (action === "create") {
        const { name, email, role_id, branch_id, department_id, password } = data;
        
        // Check if user exists
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

      // 2. Bulk Create (Import)
      if (action === "bulkCreate") {
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