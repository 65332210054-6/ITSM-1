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
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const sql = neon(databaseUrl);

    // Migration: Ensure ip_addresses table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS ip_addresses (
          id TEXT PRIMARY KEY,
          ip_address TEXT UNIQUE NOT NULL,
          subnet_mask TEXT DEFAULT '255.255.255.0',
          gateway TEXT,
          vlan TEXT,
          status TEXT DEFAULT 'Available',
          asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (migErr) {
      console.error("IPAM Migration Error:", migErr);
    }

    // Auth Check
    let authAction = 'view';
    if (request.method === 'POST') {
      if (action === 'delete') authAction = 'delete';
      else if (url.searchParams.get('id') || (await request.clone().json()).id) authAction = 'edit';
      else authAction = 'create';
    }

    const userSession = await checkModuleAccess(context, 'ipam', authAction);
    
    if (userSession === null) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    if (userSession === false) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });

    // 1. GET: List IPs
    if (request.method === "GET") {
      if (action === "getDetail") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        const ip = await sql`
          SELECT i.*, a.name as asset_name, a.asset_tag 
          FROM ip_addresses i 
          LEFT JOIN assets a ON i.asset_id = a.id 
          WHERE i.id = ${id}
        `;
        if (ip.length === 0) return new Response(JSON.stringify({ message: "IP not found" }), { status: 404 });
        return new Response(JSON.stringify(ip[0]), { headers: { "Content-Type": "application/json" } });
      }

      // Default: List with Search & Pagination
      const search = url.searchParams.get("search") || "";
      const statusFilter = url.searchParams.get("status") || "";
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      const offset = (page - 1) * limit;

      const searchPattern = `%${search}%`;

      const countResult = await sql`
        SELECT COUNT(*)::int as total 
        FROM ip_addresses i
        LEFT JOIN assets a ON i.asset_id = a.id
        WHERE (${search} = '' OR i.ip_address ILIKE ${searchPattern} OR i.description ILIKE ${searchPattern} OR a.name ILIKE ${searchPattern} OR a.asset_tag ILIKE ${searchPattern})
        AND (${statusFilter} = '' OR i.status = ${statusFilter})
      `;
      const totalCount = countResult[0]?.total || 0;

      const ips = await sql`
        SELECT i.*, a.name as asset_name, a.asset_tag 
        FROM ip_addresses i
        LEFT JOIN assets a ON i.asset_id = a.id
        WHERE (${search} = '' OR i.ip_address ILIKE ${searchPattern} OR i.description ILIKE ${searchPattern} OR a.name ILIKE ${searchPattern} OR a.asset_tag ILIKE ${searchPattern})
        AND (${statusFilter} = '' OR i.status = ${statusFilter})
        ORDER BY i.ip_address ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return new Response(JSON.stringify({
        ips,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit
      }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. POST: Create/Update/Delete
    if (request.method === "POST") {
      if (action === "delete") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM ip_addresses WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'IPAM', 'Delete', { id });
        return new Response(JSON.stringify({ message: "IP deleted successfully" }), { status: 200 });
      }

      const data = await request.json();
      const { id, ip_address, subnet_mask, gateway, vlan, status, asset_id, description } = data;

      if (!ip_address) {
        return new Response(JSON.stringify({ message: "IP Address is required" }), { status: 400 });
      }

      if (id) {
        // Update
        await sql`
          UPDATE ip_addresses 
          SET ip_address = ${ip_address}, subnet_mask = ${subnet_mask}, gateway = ${gateway}, 
              vlan = ${vlan}, status = ${status}, asset_id = ${asset_id || null}, 
              description = ${description}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'IPAM', 'Update', { id, ip_address });
        return new Response(JSON.stringify({ message: "IP updated successfully" }), { status: 200 });
      } else {
        // Create
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO ip_addresses (id, ip_address, subnet_mask, gateway, vlan, status, asset_id, description)
          VALUES (${newId}, ${ip_address}, ${subnet_mask || '255.255.255.0'}, ${gateway || null}, ${vlan || null}, ${status || 'Available'}, ${asset_id || null}, ${description || null})
        `;
        await logAction(sql, userSession.user_id, 'IPAM', 'Create', { id: newId, ip_address });
        return new Response(JSON.stringify({ message: "IP created successfully" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("IPAM API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
