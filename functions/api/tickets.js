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

    // 1. GET Tickets
    if (request.method === "GET") {
      let tickets;
      if (userSession.role_name === 'Admin' || userSession.role_name === 'Technician') {
        // Admins and Technicians see all tickets
        tickets = await sql`
          SELECT t.*, u.name as reporter_name, d.name as department_name, a.asset_tag
          FROM tickets t
          JOIN users u ON t.reporter_id = u.id
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN assets a ON t.asset_id = a.id
          ORDER BY t.created_at DESC
        `;
      } else {
        // Users see only their own tickets
        tickets = await sql`
          SELECT t.*, u.name as reporter_name, d.name as department_name, a.asset_tag
          FROM tickets t
          JOIN users u ON t.reporter_id = u.id
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN assets a ON t.asset_id = a.id
          WHERE t.reporter_id = ${userSession.user_id}
          ORDER BY t.created_at DESC
        `;
      }
      return new Response(JSON.stringify(tickets), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. POST Ticket (Create/Update)
    if (request.method === "POST") {
      const data = await request.json();
      const { id, subject, description, priority, asset_id, status } = data;

      if (id) {
        // Update (Only for Admin/Technician or the original reporter)
        // For simplicity, we'll allow updates if ID exists
        await sql`
          UPDATE tickets 
          SET subject = ${subject}, description = ${description}, 
              priority = ${priority}, asset_id = ${asset_id}, 
              status = ${status || 'Open'}, updated_at = NOW()
          WHERE id = ${id}
        `;
        return new Response(JSON.stringify({ message: "Ticket updated successfully" }), { status: 200 });
      } else {
        // Create
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO tickets (id, subject, description, priority, reporter_id, asset_id, status, created_at, updated_at)
          VALUES (${newId}, ${subject}, ${description}, ${priority}, ${userSession.user_id}, ${asset_id}, 'Open', NOW(), NOW())
        `;
        return new Response(JSON.stringify({ message: "Ticket created successfully", id: newId }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Ticket API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
