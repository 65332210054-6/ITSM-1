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
    const userSession = await checkModuleAccess(context, 'module_licenses_enabled');
    if (userSession === null) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    if (userSession === false) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });

    const sql = neon(databaseUrl);

    // Migration
    await sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT,
        license_key TEXT,
        type TEXT DEFAULT 'Perpetual',
        total_licenses INTEGER DEFAULT 1,
        purchase_date DATE,
        expiration_date DATE,
        vendor TEXT,
        price NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'Active',
        notes TEXT,
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
        SELECT COUNT(*)::int as total FROM licenses
        WHERE ${searchPattern} = '' OR name ILIKE ${searchPattern} OR vendor ILIKE ${searchPattern}
      `;
      const totalCount = countResult[0].total;

      const licenses = await sql`
        SELECT * FROM licenses
        WHERE ${searchPattern} = '' OR name ILIKE ${searchPattern} OR vendor ILIKE ${searchPattern}
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        licenses,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const { id, name, version, license_key, type, total_licenses, purchase_date, expiration_date, vendor, price, notes } = data;

      if (action === "delete") {
        const deleteId = url.searchParams.get("id");
        await sql`DELETE FROM licenses WHERE id = ${deleteId}`;
        await logAction(sql, userSession.user_id, 'Licenses', 'Delete', { id: deleteId });
        return new Response(JSON.stringify({ message: "Deleted" }), { status: 200 });
      }

      if (id) {
        // Update
        await sql`
          UPDATE licenses SET
            name = ${name}, version = ${version}, license_key = ${license_key}, 
            type = ${type}, total_licenses = ${total_licenses}, 
            purchase_date = ${purchase_date || null}, expiration_date = ${expiration_date || null}, 
            vendor = ${vendor}, price = ${price || 0}, notes = ${notes}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Licenses', 'Update', { id, name });
        return new Response(JSON.stringify({ message: "Updated" }), { status: 200 });
      } else {
        // Create
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO licenses (id, name, version, license_key, type, total_licenses, purchase_date, expiration_date, vendor, price, notes)
          VALUES (${newId}, ${name}, ${version}, ${license_key}, ${type}, ${total_licenses}, ${purchase_date || null}, ${expiration_date || null}, ${vendor}, ${price || 0}, ${notes})
        `;
        await logAction(sql, userSession.user_id, 'Licenses', 'Create', { id: newId, name });
        return new Response(JSON.stringify({ message: "Created" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Licenses API Error:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
