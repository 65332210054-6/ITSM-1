import { neon } from '@neondatabase/serverless';
import { checkModuleAccess } from '../auth.js';
import { logAction } from './logs.js';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const userSession = await checkModuleAccess(context, 'borrows', 'view');
    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: You do not have access to the Borrows module" }), { status: 403 });
    }

    const sql = neon(databaseUrl);

    // Migration
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS borrows (
          id TEXT PRIMARY KEY,
          asset_id TEXT NOT NULL REFERENCES assets(id),
          borrower_id TEXT NOT NULL REFERENCES users(id),
          borrowed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          due_date DATE,
          returned_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'Borrowed',
          notes TEXT,
          created_by TEXT REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (migErr) {
      console.error("Borrows Migration Error:", migErr);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // GET
    if (request.method === "GET") {
      if (action === "export") {
        const borrows = await sql`
          SELECT b.*, 
                 a.asset_tag, a.name as asset_name,
                 u.name as borrower_name, u.email as borrower_email,
                 d.name as department_name,
                 cb.name as created_by_name
          FROM borrows b
          JOIN assets a ON b.asset_id = a.id
          JOIN users u ON b.borrower_id = u.id
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN users cb ON b.created_by = cb.id
          ORDER BY b.created_at DESC
        `;

        const csvHeader = "\ufeff" + ["Asset Tag", "ชื่อทรัพย์สิน", "ผู้ยืม", "อีเมล", "แผนก", "วันที่ยืม", "วันกำหนดคืน", "วันที่คืน", "สถานะ", "หมายเหตุ"].join(",") + "\n";
        const csvRows = borrows.map(b => {
          const row = [
            b.asset_tag || "-",
            b.asset_name || "-",
            b.borrower_name || "-",
            b.borrower_email || "-",
            b.department_name || "-",
            b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString("th-TH") : "-",
            b.due_date ? new Date(b.due_date).toLocaleDateString("th-TH") : "-",
            b.returned_at ? new Date(b.returned_at).toLocaleDateString("th-TH") : "-",
            b.status || "-",
            b.notes || "-"
          ];
          return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
        }).join("\n");

        return new Response(csvHeader + csvRows, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"it-borrows-list.csv\""
          }
        });
      }

      // Summary stats
      if (action === "stats") {
        const stats = await sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Borrowed')::int as borrowed,
            COUNT(*) FILTER (WHERE status = 'Returned')::int as returned,
            COUNT(*) FILTER (WHERE status = 'Overdue')::int as overdue
          FROM borrows
        `;
        return new Response(JSON.stringify(stats[0]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      let limit = 10;
      let offset = 0;
      let page = 1;
      const startParam = url.searchParams.get("start");
      const endParam = url.searchParams.get("end");

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
      const statusFilter = url.searchParams.get("status") || "";
      const searchPattern = search ? `%${search}%` : "";

      // Auto-update overdue borrows
      await sql`
        UPDATE borrows 
        SET status = 'Overdue', updated_at = NOW()
        WHERE status = 'Borrowed' 
          AND due_date IS NOT NULL 
          AND due_date < CURRENT_DATE
      `;

      const countResult = await sql`
        SELECT COUNT(*)::int as total 
        FROM borrows b
        JOIN assets a ON b.asset_id = a.id
        JOIN users u ON b.borrower_id = u.id
        WHERE (${statusFilter} = '' OR b.status = ${statusFilter})
          AND (${searchPattern} = '' OR 
               a.asset_tag ILIKE ${searchPattern} OR
               a.name ILIKE ${searchPattern} OR
               u.name ILIKE ${searchPattern}
          )
      `;
      const totalCount = countResult[0]?.total || 0;

      const borrows = await sql`
        SELECT b.id, b.asset_id, b.borrower_id, b.borrowed_at, b.due_date, b.returned_at, b.status, b.notes, b.created_at,
               a.asset_tag, a.name as asset_name, a.category as asset_category,
               u.name as borrower_name, u.email as borrower_email,
               d.name as department_name
        FROM borrows b
        JOIN assets a ON b.asset_id = a.id
        JOIN users u ON b.borrower_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE (${statusFilter} = '' OR b.status = ${statusFilter})
          AND (${searchPattern} = '' OR 
               a.asset_tag ILIKE ${searchPattern} OR
               a.name ILIKE ${searchPattern} OR
               u.name ILIKE ${searchPattern}
          )
        ORDER BY b.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        borrows,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit,
        start: offset + 1,
        end: offset + limit
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // POST
    if (request.method === "POST") {

      // Return borrow
      if (action === "return") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });

        const borrow = await sql`SELECT * FROM borrows WHERE id = ${id} LIMIT 1`;
        if (borrow.length === 0) return new Response(JSON.stringify({ message: "ไม่พบข้อมูลการยืม" }), { status: 404 });
        if (borrow[0].status === 'Returned') return new Response(JSON.stringify({ message: "ทรัพย์สินนี้คืนแล้ว" }), { status: 400 });

        if (!await checkModuleAccess(context, 'borrows', 'edit', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to return assets" }), { status: 403 });
        }
        await sql`
          UPDATE borrows 
          SET status = 'Returned', returned_at = NOW(), updated_at = NOW()
          WHERE id = ${id}
        `;
        // Update asset status back to Available
        await sql`UPDATE assets SET status = 'Available', updated_at = NOW() WHERE id = ${borrow[0].asset_id}`;
        await logAction(sql, userSession.user_id, 'Borrows', 'Return', { borrow_id: id, asset_id: borrow[0].asset_id });
        return new Response(JSON.stringify({ message: "บันทึกการคืนสำเร็จ" }), { status: 200 });
      }

      // Delete
      if (action === "delete") {
        if (!await checkModuleAccess(context, 'borrows', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to delete" }), { status: 403 });
        }
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM borrows WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Borrows', 'Delete', { borrow_id: id });
        return new Response(JSON.stringify({ message: "Deleted successfully" }), { status: 200 });
      }

      // Create borrow
      if (!await checkModuleAccess(context, 'borrows', 'create', sql)) {
        return new Response(JSON.stringify({ message: "Forbidden: No permission to create borrows" }), { status: 403 });
      }

      const data = await request.json();
      const { asset_id, borrower_id, due_date, notes, borrowed_at } = data;

      if (!asset_id || !borrower_id) {
        return new Response(JSON.stringify({ message: "กรุณาระบุทรัพย์สินและผู้ยืม" }), { status: 400 });
      }

      // Check asset availability
      const asset = await sql`SELECT id, status FROM assets WHERE id = ${asset_id} LIMIT 1`;
      if (asset.length === 0) return new Response(JSON.stringify({ message: "ไม่พบทรัพย์สิน" }), { status: 404 });

      const activeBorrow = await sql`SELECT id FROM borrows WHERE asset_id = ${asset_id} AND status IN ('Borrowed', 'Overdue') LIMIT 1`;
      if (activeBorrow.length > 0) {
        return new Response(JSON.stringify({ message: "ทรัพย์สินนี้กำลังถูกยืมอยู่" }), { status: 400 });
      }

      const newId = crypto.randomUUID();
      await sql`
        INSERT INTO borrows (id, asset_id, borrower_id, due_date, notes, created_by, status, borrowed_at)
        VALUES (${newId}, ${asset_id}, ${borrower_id}, ${due_date || null}, ${notes || null}, ${userSession.user_id}, 'Borrowed', ${borrowed_at || new Date().toISOString()})
      `;

      // Update asset status to Borrowed
      await sql`UPDATE assets SET status = 'Borrowed', assigned_to = ${borrower_id}, updated_at = NOW() WHERE id = ${asset_id}`;

      await logAction(sql, userSession.user_id, 'Borrows', 'Create', { borrow_id: newId, asset_id, borrower_id });
      return new Response(JSON.stringify({ message: "บันทึกการยืมสำเร็จ" }), { status: 201 });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Borrows API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
