import { neon } from '@neondatabase/serverless';
import { validateSession, checkModuleAccess } from '../auth.js';
import { logAction } from './logs.js';
import { sendLineNotify } from '../line.js';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const userSession = await checkModuleAccess(context, 'tickets', 'view');
    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: You do not have access to the Tickets module" }), { status: 403 });
    }

    const sql = neon(databaseUrl);

    // Migration: Ensure tickets table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'Open',
          priority TEXT DEFAULT 'Medium',
          reporter_id TEXT NOT NULL REFERENCES users(id),
          assigned_to TEXT REFERENCES users(id),
          asset_id TEXT REFERENCES assets(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (migErr) {
      console.error("Tickets Migration Error:", migErr);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // 1. GET Tickets
    if (request.method === "GET") {
      if (action === "getDetail") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });

        const ticket = await sql`
          SELECT t.*, u.name as reporter_name, d.name as department_name, a.asset_tag, a.name as asset_name, tech.name as technician_name
          FROM tickets t
          JOIN users u ON t.reporter_id = u.id
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN assets a ON t.asset_id = a.id
          LEFT JOIN users tech ON t.assigned_to = tech.id
          WHERE t.id = ${id}
        `;

        if (ticket.length === 0) return new Response(JSON.stringify({ message: "Ticket not found" }), { status: 404 });

        return new Response(JSON.stringify(ticket[0]), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (action === "getOptions") {
        const tickets = await sql`SELECT id, subject FROM tickets ORDER BY created_at DESC`;
        return new Response(JSON.stringify(tickets), {
          status: 200,
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

      const isStaff = userSession.role_name === 'Admin' || userSession.role_name === 'Technician';
      const searchPattern = search ? `%${search}%` : "";

      // 1. Get total count reliably
      const countResult = await sql`
        SELECT COUNT(*)::int as total 
        FROM tickets t
        JOIN users u ON t.reporter_id = u.id
        LEFT JOIN assets a ON t.asset_id = a.id
        WHERE (${isStaff} = true OR t.reporter_id = ${userSession.user_id})
          AND (${searchPattern} = '' OR 
               t.subject ILIKE ${searchPattern} OR 
               t.description ILIKE ${searchPattern} OR 
               u.name ILIKE ${searchPattern} OR 
               a.asset_tag ILIKE ${searchPattern} OR 
               t.status ILIKE ${searchPattern}
          )
      `;
      const totalCount = countResult[0]?.total || 0;

      // 2. Get paged data
      const tickets = await sql`
        SELECT t.id, t.subject, t.description, t.status, t.priority, t.reporter_id, t.assigned_to, t.asset_id, t.created_at,
               u.name as reporter_name, d.name as department_name, a.asset_tag, tech.name as technician_name
        FROM tickets t
        JOIN users u ON t.reporter_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN assets a ON t.asset_id = a.id
        LEFT JOIN users tech ON t.assigned_to = tech.id
        WHERE (${isStaff} = true OR t.reporter_id = ${userSession.user_id})
          AND (${searchPattern} = '' OR 
               t.subject ILIKE ${searchPattern} OR 
               t.description ILIKE ${searchPattern} OR 
               u.name ILIKE ${searchPattern} OR 
               a.asset_tag ILIKE ${searchPattern} OR 
               t.status ILIKE ${searchPattern}
          )
        ORDER BY t.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        tickets,
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

    // 2. POST Ticket (Create/Update)
    if (request.method === "POST") {
      const data = await request.json();
      const { id, subject, description, priority, asset_id, status, assigned_to } = data;

      if (id) {
        // Update (Only for Admin/Technician with 'edit' permission or the original reporter)
        const existingTicket = await sql`SELECT reporter_id FROM tickets WHERE id = ${id} LIMIT 1`;

        if (existingTicket.length === 0) {
          return new Response(JSON.stringify({ message: "Ticket not found" }), { status: 404 });
        }

        const hasEditPerm = await checkModuleAccess(context, 'tickets', 'edit', sql);

        if (!hasEditPerm) {
          return new Response(JSON.stringify({ message: "Forbidden: You do not have permission to update tickets" }), { status: 403 });
        }

        await sql`
          UPDATE tickets 
          SET subject = ${subject}, description = ${description}, 
              priority = ${priority}, asset_id = ${asset_id}, 
              status = ${status || 'Open'}, assigned_to = ${assigned_to || null}, 
              updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Tickets', 'Update', { ticket_id: id, subject, status });

        // Line Notification on Resolution
        if (status === 'Resolved' || status === 'Closed') {
          const notifyMsg = `\n✅ เคสได้รับการแก้ไขแล้ว!\n🔹 เรื่อง: ${subject}\n🔸 สถานะ: ${status}\n👤 ดำเนินการโดย: ${userSession.name}`;
          await sendLineNotify(sql, notifyMsg);
        }

        return new Response(JSON.stringify({ message: "Ticket updated successfully" }), { status: 200 });
      } else {
        // Create
        if (!await checkModuleAccess(context, 'tickets', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create tickets" }), { status: 403 });
        }
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO tickets (id, subject, description, priority, reporter_id, asset_id, status, created_at, updated_at)
          VALUES (${newId}, ${subject}, ${description}, ${priority}, ${userSession.user_id}, ${asset_id}, 'Open', NOW(), NOW())
        `;
        await logAction(sql, userSession.user_id, 'Tickets', 'Create', { ticket_id: newId, subject, priority });

        // Line Notification on Creation
        const notifyMsg = `\n🆕 มีเคสแจ้งซ่อมใหม่!\n🔹 เรื่อง: ${subject}\n🔸 ความสำคัญ: ${priority}\n👤 ผู้แจ้ง: ${userSession.name}`;
        await sendLineNotify(sql, notifyMsg);

        return new Response(JSON.stringify({ message: "Ticket created successfully", id: newId }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Ticket API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
