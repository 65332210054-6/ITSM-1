import { neon } from '@neondatabase/serverless';
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

    let userSession;
    if (request.method === "GET" && action === "getOptions") {
      userSession = await validateSession(context);
      if (!userSession) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    } else {
      userSession = await checkModuleAccess(context, 'assets', 'view');
      if (userSession === null) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
      }
      if (userSession === false) {
        return new Response(JSON.stringify({ message: "Forbidden: You do not have access to the Assets module" }), { status: 403 });
      }
    }

    const sql = neon(databaseUrl);

    // Migration: Ensure assets table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          asset_tag TEXT UNIQUE NOT NULL,
          serial_number TEXT UNIQUE,
          name TEXT NOT NULL,
          category TEXT,
          model TEXT,
          status TEXT DEFAULT 'Available',
          assigned_to TEXT REFERENCES users(id),
          department_id TEXT REFERENCES departments(id),
          purchase_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (migErr) {
      console.error("Assets Migration Error:", migErr);
      // Continue anyway, table might already exist
    }

    // (action and url already parsed above)

    // 1. Get Assets List
    if (request.method === "GET") {
      if (action === "export") {
        const assets = await sql`
          SELECT a.*, u.name as assigned_to_name, d.name as department_name
          FROM assets a
          LEFT JOIN users u ON a.assigned_to = u.id
          LEFT JOIN departments d ON a.department_id = d.id
          ORDER BY a.created_at DESC
        `;

        const csvHeader = "\ufeff" + ["Asset Tag", "S/N", "ชื่อรายการ", "แบรนด์/รุ่น", "หมวดหมู่", "ผู้ครอบครอง", "แผนก", "สถานะ", "วันที่ซื้อ"].join(",") + "\n";
        const csvRows = assets.map(a => {
          const row = [
            a.asset_tag || "-",
            a.serial_number || "-",
            a.name || "-",
            a.model || "-",
            a.category || "-",
            a.assigned_to_name || "ว่าง",
            a.department_name || "ไม่ระบุ",
            a.status || "-",
            a.purchase_date && !isNaN(new Date(a.purchase_date).getTime()) ? new Date(a.purchase_date).toLocaleDateString("th-TH") : "-"
          ];
          return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
        }).join("\n");

        return new Response(csvHeader + csvRows, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"it-assets-list.csv\""
          }
        });
      }

      if (action === "getOptions") {
        const statusFilter = url.searchParams.get("status") || "";
        let assets;
        if (statusFilter) {
          assets = await sql`SELECT id, asset_tag, name, status FROM assets WHERE status = ${statusFilter} ORDER BY asset_tag ASC`;
        } else {
          assets = await sql`SELECT id, asset_tag, name, status FROM assets ORDER BY asset_tag ASC`;
        }
        return new Response(JSON.stringify(assets), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "getDetail") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });

        const asset = await sql`
          SELECT a.*, u.name as assigned_to_name, d.name as department_name, b.name as branch_name,
                 i.ip_address as linked_ip
          FROM assets a
          LEFT JOIN users u ON a.assigned_to = u.id
          LEFT JOIN departments d ON a.department_id = d.id
          LEFT JOIN branches b ON d.branch_id = b.id
          LEFT JOIN ip_addresses i ON i.asset_id = a.id
          WHERE a.id = ${id}
        `;

        if (asset.length === 0) return new Response(JSON.stringify({ message: "Asset not found" }), { status: 404 });

        const tickets = await sql`
          SELECT t.*, u.name as reporter_name
          FROM tickets t
          JOIN users u ON t.reporter_id = u.id
          WHERE t.asset_id = ${id}
          ORDER BY t.created_at DESC
        `;

        return new Response(JSON.stringify({ asset: asset[0], tickets }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      let limit = 10;
      let offset = 0;
      let page = 1;
      let startParam = url.searchParams.get("start");
      let endParam = url.searchParams.get("end");

      if (startParam && endParam) {
        const startNum = parseInt(startParam, 10);
        const endNum = parseInt(endParam, 10);
        offset = Math.max(0, startNum - 1);
        limit = Math.max(1, endNum - startNum + 1);
        page = Math.floor(offset / limit) + 1;
      } else {
        page = parseInt(url.searchParams.get("page") || "1", 10);
        limit = parseInt(url.searchParams.get("limit") || "10", 10);
        offset = (page - 1) * limit;
      }
      
      const search = url.searchParams.get("search") || "";

      const searchPattern = search ? `%${search}%` : "";

      // 1. Get total count reliably
      const countResult = await sql`
        SELECT COUNT(*)::int as total 
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE (${searchPattern} = '' OR 
               a.asset_tag ILIKE ${searchPattern} OR 
               a.serial_number ILIKE ${searchPattern} OR 
               a.name ILIKE ${searchPattern} OR
               a.model ILIKE ${searchPattern} OR
               a.category ILIKE ${searchPattern} OR
               u.name ILIKE ${searchPattern} OR
               d.name ILIKE ${searchPattern}
        )
      `;
      const totalCount = countResult[0]?.total || 0;

      // 2. Get paged data
      const assets = await sql`
        SELECT a.id, a.asset_tag, a.serial_number, a.name, a.category, a.model, a.status, a.assigned_to, a.department_id, a.purchase_date, a.created_at,
               u.name as assigned_to_name, d.name as department_name
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE (${searchPattern} = '' OR 
               a.asset_tag ILIKE ${searchPattern} OR 
               a.serial_number ILIKE ${searchPattern} OR 
               a.name ILIKE ${searchPattern} OR
               a.model ILIKE ${searchPattern} OR
               a.category ILIKE ${searchPattern} OR
               u.name ILIKE ${searchPattern} OR
               d.name ILIKE ${searchPattern}
        )
        ORDER BY a.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return new Response(JSON.stringify({ 
        assets,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit,
        start: offset + 1,
        end: offset + limit
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    // 2. Add/Edit/Delete Asset
    if (request.method === "POST") {
      // Handle Delete
      if (action === "delete") {
        if (!await checkModuleAccess(context, 'assets', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to delete assets" }), { status: 403 });
        }
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM assets WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Assets', 'Delete', { asset_id: id });
        return new Response(JSON.stringify({ message: "Asset deleted successfully" }), { status: 200 });
      }
      
      const data = await request.json();
      const { id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date } = data;

      if (id) {
        // Update
        if (!await checkModuleAccess(context, 'assets', 'edit', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to edit assets" }), { status: 403 });
        }
        await sql`
          UPDATE assets 
          SET asset_tag = ${asset_tag}, serial_number = ${serial_number}, name = ${name}, 
              category = ${category}, model = ${model || null}, status = ${status}, 
              assigned_to = ${assigned_to || null}, department_id = ${department_id || null}, 
              purchase_date = ${purchase_date || null}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Assets', 'Update', { asset_id: id, asset_tag, name, status });
        return new Response(JSON.stringify({ message: "Asset updated successfully" }), { status: 200 });
      } else {
        // Create
        if (!await checkModuleAccess(context, 'assets', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create assets" }), { status: 403 });
        }
        // ... (rest of Create logic)

        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO assets (id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date, created_at, updated_at)
          VALUES (${newId}, ${asset_tag}, ${serial_number}, ${name}, ${category}, ${model || null}, ${status}, ${assigned_to || null}, ${department_id || null}, ${purchase_date || null}, NOW(), NOW())
        `;
        await logAction(sql, userSession.user_id, 'Assets', 'Create', { asset_id: newId, asset_tag, name, status });
        return new Response(JSON.stringify({ message: "Asset created successfully" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Asset API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
