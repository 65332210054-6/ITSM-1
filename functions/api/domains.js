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
    const userSession = await checkModuleAccess(context, 'module_domains_enabled');
    if (userSession === null) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    if (userSession === false) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });

    const sql = neon(databaseUrl);

    // Migration
    await sql`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        registrar TEXT,
        registration_date DATE,
        expiration_date DATE NOT NULL,
        ssl_type TEXT,
        ssl_issuer TEXT,
        ssl_expiration DATE,
        hosting_provider TEXT,
        hosting_package TEXT,
        hosting_cost NUMERIC,
        hosting_expiration DATE,
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
        SELECT COUNT(*)::int as total FROM domains
        WHERE ${searchPattern} = '' OR name ILIKE ${searchPattern} OR registrar ILIKE ${searchPattern}
      `;
      const totalCount = countResult[0].total;

      const domains = await sql`
        SELECT * FROM domains
        WHERE ${searchPattern} = '' OR name ILIKE ${searchPattern} OR registrar ILIKE ${searchPattern}
        ORDER BY expiration_date ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        domains,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const { id, name, registrar, registration_date, expiration_date, ssl_type, ssl_issuer, ssl_expiration, hosting_provider, hosting_package, hosting_cost, hosting_expiration, notes } = data;

      if (action === "delete") {
        const deleteId = url.searchParams.get("id");
        await sql`DELETE FROM domains WHERE id = ${deleteId}`;
        await logAction(sql, userSession.user_id, 'Domains', 'Delete', { id: deleteId });
        return new Response(JSON.stringify({ message: "Deleted" }), { status: 200 });
      }

      if (id) {
        // Update
        await sql`
          UPDATE domains SET
            name = ${name}, registrar = ${registrar}, registration_date = ${registration_date || null}, 
            expiration_date = ${expiration_date}, ssl_type = ${ssl_type}, ssl_issuer = ${ssl_issuer}, 
            ssl_expiration = ${ssl_expiration || null}, hosting_provider = ${hosting_provider}, 
            hosting_package = ${hosting_package}, hosting_cost = ${hosting_cost || 0}, 
            hosting_expiration = ${hosting_expiration || null}, notes = ${notes}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Domains', 'Update', { id, name });
        return new Response(JSON.stringify({ message: "Updated" }), { status: 200 });
      } else {
        // Create
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO domains (id, name, registrar, registration_date, expiration_date, ssl_type, ssl_issuer, ssl_expiration, hosting_provider, hosting_package, hosting_cost, hosting_expiration, notes)
          VALUES (${newId}, ${name}, ${registrar}, ${registration_date || null}, ${expiration_date}, ${ssl_type}, ${ssl_issuer}, ${ssl_expiration || null}, ${hosting_provider}, ${hosting_package}, ${hosting_cost || 0}, ${hosting_expiration || null}, ${notes})
        `;
        await logAction(sql, userSession.user_id, 'Domains', 'Create', { id: newId, name });
        return new Response(JSON.stringify({ message: "Created" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Domains API Error:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
