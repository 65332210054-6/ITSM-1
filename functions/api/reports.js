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
      const [assetStats, ticketStats, borrowStats, consumableStats, domainStats, licenseStats, ipStats] = await Promise.all([
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Available')::int as available,
            COUNT(*) FILTER (WHERE status = 'In Use')::int as in_use,
            COUNT(*) FILTER (WHERE status = 'Repairing')::int as repairing,
            COUNT(*) FILTER (WHERE status = 'Borrowed')::int as borrowed
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
        `.catch(() => [{ total: 0, borrowed: 0, returned: 0, overdue: 0 }]),
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE quantity <= min_quantity)::int as low_stock
          FROM consumables
        `.catch(() => [{ total: 0, low_stock: 0 }]),
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE expiration_date <= NOW() + INTERVAL '30 days')::int as expiring_soon
          FROM domains
        `.catch(() => [{ total: 0, expiring_soon: 0 }]),
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE expiration_date <= NOW() + INTERVAL '30 days')::int as expiring_soon
          FROM licenses
        `.catch(() => [{ total: 0, expiring_soon: 0 }]),
        sql`
          SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'Reserved')::int as reserved
          FROM ip_addresses
        `.catch(() => [{ total: 0, reserved: 0 }])
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

      return new Response(JSON.stringify({
        assets: assetStats[0],
        tickets: ticketStats[0],
        borrows: borrowStats[0],
        consumables: consumableStats[0],
        domains: domainStats[0],
        licenses: licenseStats[0],
        ips: ipStats[0],
        assetByCategory
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
        SELECT t.id, t.subject, t.status, t.priority, t.created_at,
               u.name as reporter_name, d.name as department_name,
               tech.name as technician_name
        FROM tickets t
        JOIN users u ON t.reporter_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN users tech ON t.assigned_to = tech.id
        ORDER BY t.created_at DESC
      `;

      const headers = ["เลขที่", "หัวข้อ", "สถานะ", "ความเร่งด่วน", "ผู้แจ้ง", "แผนก", "ช่างผู้รับผิดชอบ", "วันที่แจ้ง"];
      const rows = tickets.map((t, i) => [
        i + 1, t.subject || "-", t.status || "-", t.priority || "-",
        t.reporter_name || "-", t.department_name || "-", t.technician_name || "-",
        t.created_at ? new Date(t.created_at).toLocaleDateString("th-TH") : "-"
      ]);

      return buildCSVResponse(headers, rows, "it-tickets-export.csv");
    }

    // Export Borrows CSV
    if (action === "export-borrows") {
      const borrows = await sql`
        SELECT b.status, b.borrowed_at, b.due_date, b.returned_at,
               a.asset_tag, a.name as asset_name,
               u.name as borrower_name
        FROM borrows b
        JOIN assets a ON b.asset_id = a.id
        JOIN users u ON b.borrower_id = u.id
        ORDER BY b.created_at DESC
      `;

      const headers = ["Asset Tag", "ชื่อทรัพย์สิน", "ผู้ยืม", "วันที่ยืม", "วันกำหนดคืน", "วันที่คืน", "สถานะ"];
      const rows = borrows.map(b => [
        b.asset_tag || "-", b.asset_name || "-", b.borrower_name || "-",
        b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString("th-TH") : "-",
        b.due_date ? new Date(b.due_date).toLocaleDateString("th-TH") : "-",
        b.returned_at ? new Date(b.returned_at).toLocaleDateString("th-TH") : "-",
        b.status || "-"
      ]);

      return buildCSVResponse(headers, rows, "it-borrows-export.csv");
    }

    // Export Consumables
    if (action === "export-consumables") {
        const items = await sql`SELECT * FROM consumables ORDER BY name ASC`;
        const headers = ["ชื่อพัสดุ", "หมวดหมู่", "คงเหลือ", "ขั้นต่ำ", "หน่วย", "สถานที่เก็บ"];
        const rows = items.map(i => [i.name, i.category, i.quantity, i.min_quantity, i.unit, i.location]);
        return buildCSVResponse(headers, rows, "it-consumables-export.csv");
    }

    // Export Domains
    if (action === "export-domains") {
        const items = await sql`SELECT * FROM domains ORDER BY expiration_date ASC`;
        const headers = ["Domain", "Registrar", "วันหมดอายุ Domain", "SSL Type", "วันหมดอายุ SSL", "Hosting", "วันหมดอายุ Hosting", "สถานะ"];
        const rows = items.map(i => [
            i.name, i.registrar, 
            i.expiration_date ? new Date(i.expiration_date).toLocaleDateString("th-TH") : "-",
            i.ssl_type || "-",
            i.ssl_expiration ? new Date(i.ssl_expiration).toLocaleDateString("th-TH") : "-",
            i.hosting_provider || "-",
            i.hosting_expiration ? new Date(i.hosting_expiration).toLocaleDateString("th-TH") : "-",
            i.status
        ]);
        return buildCSVResponse(headers, rows, "it-domains-export.csv");
    }

    // Export Licenses
    if (action === "export-licenses") {
        const items = await sql`SELECT * FROM licenses ORDER BY name ASC`;
        const headers = ["Software", "Version", "License Key", "Type", "จำนวน", "วันหมดอายุ", "Vendor", "ราคา", "สถานะ"];
        const rows = items.map(i => [
            i.name, i.version || "-", i.license_key || "-", i.type, i.total_licenses,
            i.expiration_date ? new Date(i.expiration_date).toLocaleDateString("th-TH") : "-",
            i.vendor || "-", i.price || 0, i.status
        ]);
        return buildCSVResponse(headers, rows, "it-licenses-export.csv");
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
