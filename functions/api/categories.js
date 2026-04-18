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

    // 1. Session & Access Control
    const userSession = await checkModuleAccess(context, 'categories', 'view', sql);
    if (userSession === null) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: "Forbidden: No access to Categories" }), { status: 403 });
    }

    // Migration: Ensure asset_categories table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS asset_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          icon TEXT DEFAULT 'box',
          color TEXT DEFAULT 'slate',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Seed default categories if empty
      const existing = await sql`SELECT COUNT(*)::int as count FROM asset_categories`;
      if (existing[0].count === 0) {
        const defaults = [
          { name: 'Laptop', icon: 'laptop', color: 'blue' },
          { name: 'Desktop', icon: 'monitor', color: 'indigo' },
          { name: 'Monitor', icon: 'tv-2', color: 'violet' },
          { name: 'Printer', icon: 'printer', color: 'amber' },
          { name: 'Mobile Phone', icon: 'smartphone', color: 'green' },
          { name: 'Network Device', icon: 'wifi', color: 'cyan' },
          { name: 'Server', icon: 'server', color: 'red' },
          { name: 'Other', icon: 'box', color: 'slate' },
        ];
        for (const cat of defaults) {
          await sql`
            INSERT INTO asset_categories (id, name, icon, color)
            VALUES (${crypto.randomUUID()}, ${cat.name}, ${cat.icon}, ${cat.color})
            ON CONFLICT (name) DO NOTHING
          `;
        }
      }
    } catch (migErr) {
      console.error("Categories Migration Error:", migErr);
    }

    // GET: List all categories
    if (request.method === "GET") {
      const categories = await sql`
        SELECT * FROM asset_categories ORDER BY name ASC
      `;
      return new Response(JSON.stringify(categories), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // POST: Create / Update / Delete
    if (request.method === "POST") {
      if (action === "delete") {
        if (!await checkModuleAccess(context, 'categories', 'delete', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to delete" }), { status: 403 });
        }
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });

        // Check if category is in use
        const inUse = await sql`SELECT COUNT(*)::int as count FROM assets WHERE category = (SELECT name FROM asset_categories WHERE id = ${id})`;
        if (inUse[0].count > 0) {
          return new Response(JSON.stringify({ message: `หมวดหมู่นี้มีทรัพย์สิน ${inUse[0].count} รายการ ไม่สามารถลบได้` }), { status: 400 });
        }

        await sql`DELETE FROM asset_categories WHERE id = ${id}`;
        await logAction(sql, userSession.user_id, 'Categories', 'Delete', { category_id: id });
        return new Response(JSON.stringify({ message: "Deleted successfully" }), { status: 200 });
      }

      const data = await request.json();
      const { id, name, icon, color } = data;

      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ message: "กรุณาระบุชื่อหมวดหมู่" }), { status: 400 });
      }

      if (id) {
        // Update
        if (!await checkModuleAccess(context, 'categories', 'edit', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to edit" }), { status: 403 });
        }
        await sql`
          UPDATE asset_categories
          SET name = ${name.trim()}, icon = ${icon || 'box'}, color = ${color || 'slate'}, updated_at = NOW()
          WHERE id = ${id}
        `;
        await logAction(sql, userSession.user_id, 'Categories', 'Update', { category_id: id, name });
        return new Response(JSON.stringify({ message: "Updated successfully" }), { status: 200 });
      } else {
        // Create
        if (!await checkModuleAccess(context, 'categories', 'create', sql)) {
          return new Response(JSON.stringify({ message: "Forbidden: No permission to create" }), { status: 403 });
        }
        const existing = await sql`SELECT id FROM asset_categories WHERE name = ${name.trim()} LIMIT 1`;
        if (existing.length > 0) {
          return new Response(JSON.stringify({ message: "หมวดหมู่นี้มีอยู่แล้ว" }), { status: 400 });
        }
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO asset_categories (id, name, icon, color)
          VALUES (${newId}, ${name.trim()}, ${icon || 'box'}, ${color || 'slate'})
        `;
        await logAction(sql, userSession.user_id, 'Categories', 'Create', { category_id: newId, name });
        return new Response(JSON.stringify({ message: "Created successfully" }), { status: 201 });
      }
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    console.error("Categories API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error: " + error.message }), { status: 500 });
  }
}
