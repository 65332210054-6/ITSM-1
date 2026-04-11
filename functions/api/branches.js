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
    
    // Migration: Ensure branches table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS branches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      // Fix NOT NULL constraint on legacy 'code' column if it exists
      try {
        await sql`ALTER TABLE branches ALTER COLUMN code DROP NOT NULL`;
      } catch (codeErr) {}
    } catch (migErr) {
      console.error("Branches Migration Error:", migErr);
    }
    
    if (request.method === "GET") {
      const branches = await sql`SELECT id, code, name, address as location, created_at, updated_at FROM branches ORDER BY code ASC`;
      return new Response(JSON.stringify(branches), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Add/Delete Branch (Admin only)
    if (request.method === "POST") {
      if (userSession.role_name !== "Admin") {
        return new Response(JSON.stringify({ message: "Forbidden: Admin role required" }), { status: 403 });
      }

      const url = new URL(request.url);
      const action = url.searchParams.get("action");

      // Delete Branch
      if (action === "delete") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM branches WHERE id = ${id}`;
        return new Response(JSON.stringify({ message: "Branch deleted successfully" }), { status: 200 });
      }

      // Create Branch
      const { name, location } = await request.json();
      if (!name) return new Response(JSON.stringify({ message: "ชื่อสาขาจำเป็นต้องระบุ" }), { status: 400 });

      const newId = crypto.randomUUID();
      
      const maxCodeRows = await sql`
        SELECT code FROM branches 
        WHERE code ~ '^[0-9]+$' 
        ORDER BY CAST(code AS INTEGER) DESC LIMIT 1
      `;
      let nextCodeNum = 1;
      if (maxCodeRows.length > 0 && maxCodeRows[0].code) {
        nextCodeNum = parseInt(maxCodeRows[0].code, 10) + 1;
      }
      const newCode = String(nextCodeNum).padStart(3, '0');

      await sql`
        INSERT INTO branches (id, code, name, address, created_at, updated_at)
        VALUES (${newId}, ${newCode}, ${name}, ${location || null}, NOW(), NOW())
      `;

      return new Response(JSON.stringify({ message: "Branch created successfully" }), { status: 201 });
    }

    // 3. Update Branch (Admin only)
    if (request.method === "PUT") {
      if (userSession.role_name !== "Admin") {
        return new Response(JSON.stringify({ message: "Forbidden: Admin role required" }), { status: 403 });
      }
      const { id, name, location } = await request.json();
      if (!id || !name) return new Response(JSON.stringify({ message: "ข้อมูลไม่ครบถ้วน" }), { status: 400 });
      await sql`
        UPDATE branches 
        SET name = ${name}, address = ${location || null}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return new Response(JSON.stringify({ message: "Branch updated successfully" }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    return new Response(JSON.stringify({ message: "Server Error", error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}