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
    const userSession = await checkModuleAccess(context, 'consumables', 'view');
    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: You do not have access to the Consumables module" }), { status: 403 });
    }

    const sql = neon(databaseUrl);

    // Migration: Ensure consumables and logs table exist
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS consumables (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          quantity INTEGER DEFAULT 0,
          min_quantity INTEGER DEFAULT 5,
          unit TEXT DEFAULT 'ชิ้น',
          location TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS consumable_logs (
          id TEXT PRIMARY KEY,
          consumable_id TEXT REFERENCES consumables(id) ON DELETE CASCADE,
          action TEXT NOT NULL, -- 'IN' or 'OUT'
          quantity INTEGER NOT NULL,
          user_id TEXT REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (migErr) {
      console.error("Consumables Migration Error:", migErr);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // 1. GET Consumables
    if (request.method === "GET") {
      if (action === "getHistory") {
        const consumable_id = url.searchParams.get("id");
        if (!consumable_id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        const history = await sql`
          SELECT cl.*, u.name as user_name
          FROM consumable_logs cl
          LEFT JOIN users u ON cl.user_id = u.id
          WHERE cl.consumable_id = ${consumable_id}
          ORDER BY cl.created_at DESC
          LIMIT 50
        `;
        return new Response(JSON.stringify(history), { headers: { "Content-Type": "application/json" } });
      }

      const search = url.searchParams.get("search") || "";
      const searchPattern = search ? `%${search}%` : "";
      
      const items = await sql`
        SELECT * FROM consumables 
        WHERE (${searchPattern} = '' OR 
               name ILIKE ${searchPattern} OR 
               category ILIKE ${searchPattern} OR 
               location ILIKE ${searchPattern})
        ORDER BY (quantity <= min_quantity) DESC, quantity ASC, name ASC
      `;
      
      return new Response(JSON.stringify(items), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. POST Consumables (Create/Update/Adjust)
    if (request.method === "POST") {
      if (action === "adjust") {
        const { id, adjustment, type, notes } = await request.json();
        if (!id || !adjustment || !type) {
          return new Response(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
        }
        
        const change = type === 'IN' ? parseInt(adjustment) : -parseInt(adjustment);
        
        // Update quantity
        const updated = await sql`
          UPDATE consumables 
          SET quantity = quantity + ${change}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING name, quantity
        `;
        
        if (updated.length === 0) {
          return new Response(JSON.stringify({ message: "Item not found" }), { status: 404 });
        }

        // Record Log
        const logId = crypto.randomUUID();
        await sql`
          INSERT INTO consumable_logs (id, consumable_id, action, quantity, user_id, notes)
          VALUES (${logId}, ${id}, ${type}, ${Math.abs(adjustment)}, ${userSession.user_id}, ${notes})
        `;

        await logAction(sql, userSession.user_id, 'Consumables', type, { 
          consumable_id: id, 
          item_name: updated[0].name,
          change, 
          new_quantity: updated[0].quantity 
        });
        
        return new Response(JSON.stringify({ 
          message: "Stock adjusted successfully", 
          new_quantity: updated[0].quantity 
        }), { status: 200 });
      }

      if (action === "delete") {
        if (!await checkModuleAccess(context, 'consumables', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
        }
        const id = url.searchParams.get("id");
        await sql`DELETE FROM consumables WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Consumables', 'Delete', { id });
        return new Response(JSON.stringify({ message: "Item deleted" }), { status: 200 });
      }

      // Create or Update
      const data = await request.json();
      const { id, name, category, min_quantity, unit, location } = data;

      if (id) {
        if (!await checkModuleAccess(context, 'consumables', 'edit', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
        }
        await sql`
          UPDATE consumables 
          SET name = ${name}, category = ${category}, 
              min_quantity = ${parseInt(min_quantity)}, unit = ${unit}, 
              location = ${location}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Consumables', 'Update', { id, name });
        return new Response(JSON.stringify({ message: "Item updated" }), { status: 200 });
      } else {
        if (!await checkModuleAccess(context, 'consumables', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
        }
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO consumables (id, name, category, min_quantity, unit, location, quantity)
          VALUES (${newId}, ${name}, ${category}, ${parseInt(min_quantity)}, ${unit}, ${location}, 0)
        `;
        await logAction(sql, userSession.user_id, 'Consumables', 'Create', { id: newId, name });
        return new Response(JSON.stringify({ message: "Item created", id: newId }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Consumables API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
