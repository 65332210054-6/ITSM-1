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

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // 1. Get Assets List
    if (request.method === "GET") {
      const assets = await sql`
        SELECT a.*, u.name as assigned_to_name, d.name as department_name
        FROM assets a
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        ORDER BY a.created_at DESC
      `;
      return new Response(JSON.stringify(assets), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Add/Edit/Delete Asset (Admin/Technician only)
    if (request.method === "POST") {
      if (userSession.role_name !== "Admin" && userSession.role_name !== "Technician") {
        return new Response(JSON.stringify({ message: "Forbidden: Unauthorized to manage assets" }), { status: 403 });
      }
      
      const data = await request.json();

      // Handle Delete
      if (action === "delete") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM assets WHERE id = ${id}`;
        return new Response(JSON.stringify({ message: "Asset deleted successfully" }), { status: 200 });
      }

      const { id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date } = data;

      if (id) {
        // Update
        await sql`
          UPDATE assets 
          SET asset_tag = ${asset_tag}, serial_number = ${serial_number}, name = ${name}, 
              category = ${category}, model = ${model || null}, status = ${status}, 
              assigned_to = ${assigned_to || null}, department_id = ${department_id || null}, 
              purchase_date = ${purchase_date || null}, updated_at = NOW()
          WHERE id = ${id}
        `;
        return new Response(JSON.stringify({ message: "Asset updated successfully" }), { status: 200 });
      } else {
        // Create - Check for existing tag
        const existing = await sql`SELECT id FROM assets WHERE asset_tag = ${asset_tag} LIMIT 1`;
        if (existing.length > 0) {
          return new Response(JSON.stringify({ message: "Asset Tag นี้มีอยู่ในระบบแล้ว" }), { status: 400 });
        }

        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO assets (id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date, created_at, updated_at)
          VALUES (${newId}, ${asset_tag}, ${serial_number}, ${name}, ${category}, ${model || null}, ${status}, ${assigned_to || null}, ${department_id || null}, ${purchase_date || null}, NOW(), NOW())
        `;
        return new Response(JSON.stringify({ message: "Asset created successfully" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Asset API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
