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
    
    // Migration: Ensure departments table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      // Ensure branch_id column exists (in case table was created without it previously)
      try {
        await sql`ALTER TABLE departments ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL`;
      } catch (colErr) {}
      
      // Fix NOT NULL constraint on legacy 'code' column if it exists
      try {
        await sql`ALTER TABLE departments ALTER COLUMN code DROP NOT NULL`;
      } catch (codeErr) {}
    } catch (migErr) {
      console.error("Departments Migration Error:", migErr);
    }
    
    if (request.method === "GET") {
      const departments = await sql`
        SELECT d.*, b.name as branch_name 
        FROM departments d 
        LEFT JOIN branches b ON d.branch_id = b.id 
        ORDER BY d.code ASC
      `;
      return new Response(JSON.stringify(departments), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Add/Delete Department (Admin only)
    if (request.method === "POST") {
      if (userSession.role_name !== "Admin") {
        return new Response(JSON.stringify({ message: "Forbidden: Admin role required" }), { status: 403 });
      }

      const url = new URL(request.url);
      const action = url.searchParams.get("action");

      // Delete Department
      if (action === "delete") {
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
        await sql`DELETE FROM departments WHERE id = ${id}`;
        return new Response(JSON.stringify({ message: "Department deleted successfully" }), { status: 200 });
      }

      // Create Department
      const { name, branch_id } = await request.json();
      if (!name) return new Response(JSON.stringify({ message: "ชื่อแผนกจำเป็นต้องระบุ" }), { status: 400 });

      const newId = crypto.randomUUID();

      const maxCodeRows = await sql`
        SELECT code FROM departments 
        WHERE code ~ '^[0-9]+$' 
        ORDER BY CAST(code AS INTEGER) DESC LIMIT 1
      `;
      let nextCodeNum = 1;
      if (maxCodeRows.length > 0 && maxCodeRows[0].code) {
        nextCodeNum = parseInt(maxCodeRows[0].code, 10) + 1;
      }
      const newCode = String(nextCodeNum).padStart(3, '0');

      await sql`
        INSERT INTO departments (id, code, name, branch_id, created_at, updated_at)
        VALUES (${newId}, ${newCode}, ${name}, ${branch_id || null}, NOW(), NOW())
      `;

      return new Response(JSON.stringify({ message: "Department created successfully" }), { status: 201 });
    }

    // 3. Update Department (Admin only)
    if (request.method === "PUT") {
      if (userSession.role_name !== "Admin") {
        return new Response(JSON.stringify({ message: "Forbidden: Admin role required" }), { status: 403 });
      }
      const { id, name, branch_id } = await request.json();
      if (!id || !name) return new Response(JSON.stringify({ message: "ข้อมูลไม่ครบถ้วน" }), { status: 400 });
      await sql`
        UPDATE departments 
        SET name = ${name}, branch_id = ${branch_id || null}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return new Response(JSON.stringify({ message: "Department updated successfully" }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });

  } catch (error) {
    return new Response(JSON.stringify({ message: "Server Error", error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}