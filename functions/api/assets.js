import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: "DATABASE_URL is not set" }), { status: 500 });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer session-")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    const sql = neon(databaseUrl);
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

    // 2. Add/Edit Asset
    if (request.method === "POST") {
      const data = await request.json();
      const { id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date } = data;

      if (id) {
        // Update
        await sql`
          UPDATE assets 
          SET asset_tag = ${asset_tag}, serial_number = ${serial_number}, name = ${name}, 
              category = ${category}, model = ${model}, status = ${status}, 
              assigned_to = ${assigned_to}, department_id = ${department_id}, 
              purchase_date = ${purchase_date}, updated_at = NOW()
          WHERE id = ${id}
        `;
        return new Response(JSON.stringify({ message: "Asset updated successfully" }), { status: 200 });
      } else {
        // Create
        const newId = crypto.randomUUID();
        await sql`
          INSERT INTO assets (id, asset_tag, serial_number, name, category, model, status, assigned_to, department_id, purchase_date, created_at, updated_at)
          VALUES (${newId}, ${asset_tag}, ${serial_number}, ${name}, ${category}, ${model}, ${status}, ${assigned_to}, ${department_id}, ${purchase_date}, NOW(), NOW())
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
