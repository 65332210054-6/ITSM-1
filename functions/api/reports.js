import { neon } from '@neondatabase/serverless';
import { validateSession } from '../auth.js';

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

    const isStaff = userSession.role_name === 'Admin' || userSession.role_name === 'Technician';
    if (!isStaff) {
      return new Response(JSON.stringify({ message: "Forbidden: Staff only" }), { status: 403 });
    }

    const sql = neon(databaseUrl);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // Summary Stats
    if (action === "summary") {
      const [assetStats, ticketStats, borrowStats] = await Promise.all([
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Available')::int as available,
            COUNT(*) FILTER (WHERE status = 'In Use')::int as in_use,
            COUNT(*) FILTER (WHERE status = 'Repairing')::int as repairing,
            COUNT(*) FILTER (WHERE status = 'Borrowed')::int as borrowed,
            COUNT(*) FILTER (WHERE status = 'Broken')::int as broken,
            COUNT(*) FILTER (WHERE status = 'Retired')::int as retired
          FROM assets
        `,
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Open')::int as open,
            COUNT(*) FILTER (WHERE status = 'In Progress')::int as in_progress,
            COUNT(*) FILTER (WHERE status = 'Resolved')::int as resolved,
            COUNT(*) FILTER (WHERE status = 'Closed')::int as closed
          FROM tickets
        `,
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Borrowed')::int as borrowed,
            COUNT(*) FILTER (WHERE status = 'Returned')::int as returned,
            COUNT(*) FILTER (WHERE status = 'Overdue')::int as overdue
          FROM borrows
        `.catch(() => [{ total: 0, borrowed: 0, returned: 0, overdue: 0 }])
      ]);

      // Asset by category
      const assetByCategory = await sql`
        SELECT 
          COALESCE(category, 'ไม่ระบุ') as category,
          COUNT(*)::int as count
        FROM assets
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `;

      // Recent ticket activity (last 30 days)
      const ticketTrend = await sql`
        SELECT 
          DATE_TRUNC('day', created_at)::date as date,
          COUNT(*)::int as count
        FROM tickets
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)::date
        ORDER BY date ASC
      `;

      return new Response(JSON.stringify({
        assets: assetStats[0],
        tickets: ticketStats[0],
        borrows: borrowStats[0],
        assetByCategory,
        ticketTrend
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Export Assets CSV
    if (action === "export-assets") {
      const assets = await sql`
        SELECT a.asset_tag, a.serial_number, a.name, a.model, a.category, 
               a.status, a.purchase_date, a.created_at,
               u.name as assigned_to_name, u.email as assigned_to_email,
               d.name as department_name, b.name as branch_name
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN branches b ON d.branch_id = b.id
        ORDER BY a.created_at DESC
      `;

      const headers = ["Asset Tag", "S/N", "ชื่อรายการ", "แบรนด์/รุ่น", "หมวดหมู่", "ผู้ครอบครอง", "อีเมล", "แผนก", "สาขา", "สถานะ", "วันที่ซื้อ", "วันที่เพิ่ม"];
      const rows = assets.map(a => [
        a.asset_tag || "-", a.serial_number || "-", a.name || "-", a.model || "-",
        a.category || "-", a.assigned_to_name || "ว่าง", a.assigned_to_email || "-",
        a.department_name || "-", a.branch_name || "-", a.status || "-",
        a.purchase_date ? new Date(a.purchase_date).toLocaleDateString("th-TH") : "-",
        a.created_at ? new Date(a.created_at).toLocaleDateString("th-TH") : "-"
      ]);

      return buildCSVResponse(headers, rows, "it-assets-export.csv");
    }

    // Export Tickets CSV
    if (action === "export-tickets") {
      const tickets = await sql`
        SELECT t.id, t.subject, t.description, t.status, t.priority, t.created_at, t.updated_at,
               u.name as reporter_name, u.email as reporter_email,
               d.name as department_name,
               a.asset_tag, a.name as asset_name,
               tech.name as technician_name
        FROM tickets t
        JOIN users u ON t.reporter_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN assets a ON t.asset_id = a.id
        LEFT JOIN users tech ON t.assigned_to = tech.id
        ORDER BY t.created_at DESC
      `;

      const headers = ["เลขที่", "หัวข้อ", "รายละเอียด", "สถานะ", "ความเร่งด่วน", "ผู้แจ้ง", "อีเมล", "แผนก", "Asset Tag", "ชื่อ Asset", "ช่างผู้รับผิดชอบ", "วันที่แจ้ง", "อัปเดตล่าสุด"];
      const rows = tickets.map((t, i) => [
        i + 1, t.subject || "-", t.description || "-", t.status || "-", t.priority || "-",
        t.reporter_name || "-", t.reporter_email || "-", t.department_name || "-",
        t.asset_tag || "-", t.asset_name || "-", t.technician_name || "-",
        t.created_at ? new Date(t.created_at).toLocaleDateString("th-TH") : "-",
        t.updated_at ? new Date(t.updated_at).toLocaleDateString("th-TH") : "-"
      ]);

      return buildCSVResponse(headers, rows, "it-tickets-export.csv");
    }

    // Export Borrows CSV
    if (action === "export-borrows") {
      let borrows = [];
      try {
        borrows = await sql`
          SELECT b.id, b.status, b.borrowed_at, b.due_date, b.returned_at, b.notes,
                 a.asset_tag, a.name as asset_name, a.category as asset_category,
                 u.name as borrower_name, u.email as borrower_email,
                 d.name as department_name, cb.name as created_by_name
          FROM borrows b
          JOIN assets a ON b.asset_id = a.id
          JOIN users u ON b.borrower_id = u.id
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN users cb ON b.created_by = cb.id
          ORDER BY b.created_at DESC
        `;
      } catch (e) { borrows = []; }

      const headers = ["Asset Tag", "ชื่อทรัพย์สิน", "หมวดหมู่", "ผู้ยืม", "อีเมล", "แผนก", "วันที่ยืม", "วันกำหนดคืน", "วันที่คืน", "สถานะ", "หมายเหตุ", "บันทึกโดย"];
      const rows = borrows.map(b => [
        b.asset_tag || "-", b.asset_name || "-", b.asset_category || "-",
        b.borrower_name || "-", b.borrower_email || "-", b.department_name || "-",
        b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString("th-TH") : "-",
        b.due_date ? new Date(b.due_date).toLocaleDateString("th-TH") : "-",
        b.returned_at ? new Date(b.returned_at).toLocaleDateString("th-TH") : "-",
        b.status || "-", b.notes || "-", b.created_by_name || "-"
      ]);

      return buildCSVResponse(headers, rows, "it-borrows-export.csv");
    }

    return new Response(JSON.stringify({ message: "Action not found" }), { status: 400 });

  } catch (error) {
    console.error("Reports API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}

function buildCSVResponse(headers, rows, filename) {
  const csvHeader = "\ufeff" + headers.join(",") + "\n";
  const csvRows = rows.map(row =>
    row.map(cell => `"${String(cell === null || cell === undefined ? '' : cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  return new Response(csvHeader + csvRows, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
