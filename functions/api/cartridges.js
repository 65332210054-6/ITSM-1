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
    const userSession = await checkModuleAccess(context, 'cartridges', 'view');
    if (userSession === null) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    if (userSession === false) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });

    const sql = neon(databaseUrl);

    // Migration
    await sql`
      CREATE TABLE IF NOT EXISTS cartridges (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        color TEXT DEFAULT 'Black',
        type TEXT DEFAULT 'Original',
        price NUMERIC DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 2,
        printer_models TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (request.method === "GET") {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      const search = url.searchParams.get("search") || "";
      const offset = (page - 1) * limit;
      const searchPattern = search ? `%${search}%` : "";

      const countResult = await sql`
        SELECT COUNT(*)::int as total FROM cartridges
        WHERE ${searchPattern} = '' OR model ILIKE ${searchPattern} OR printer_models ILIKE ${searchPattern}
      `;
      const totalCount = countResult[0].total;

      const cartridges = await sql`
        SELECT * FROM cartridges
        WHERE ${searchPattern} = '' OR model ILIKE ${searchPattern} OR printer_models ILIKE ${searchPattern}
        ORDER BY model ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        cartridges,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const { id, model, color, type, price, quantity, min_stock, printer_models } = data;

      if (action === "delete") {
        if (!await checkModuleAccess(context, 'cartridges', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to delete" }), { status: 403 });
        }
        const deleteId = url.searchParams.get("id");
        await sql`DELETE FROM cartridges WHERE id = ${deleteId}`;
        await logAction(sql, userSession.user_id, 'Cartridges', 'Delete', { id: deleteId });
        return new Response(JSON.stringify({ message: "Deleted" }), { status: 200 });
      }

      if (id) {
        // Update
        if (!await checkModuleAccess(context, 'cartridges', 'edit', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to edit" }), { status: 403 });
        }
        await sql`
          UPDATE cartridges SET
            model = ${model}, color = ${color}, type = ${type}, 
            price = ${price}, quantity = ${quantity}, min_stock = ${min_stock}, 
            printer_models = ${printer_models}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Cartridges', 'Update', { id, model });
        return new Response(JSON.stringify({ message: "Updated" }), { status: 200 });
      } else {
        // Create
        if (!await checkModuleAccess(context, 'cartridges', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create" }), { status: 403 });
        }
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO cartridges (id, model, color, type, price, quantity, min_stock, printer_models)
          VALUES (${newId}, ${model}, ${color}, ${type}, ${price}, ${quantity}, ${min_stock}, ${printer_models})
        `;
        await logAction(sql, userSession.user_id, 'Cartridges', 'Create', { id: newId, model });
        return new Response(JSON.stringify({ message: "Created" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Cartridges API Error:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
