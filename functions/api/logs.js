import { validateSession } from '../auth.js';
import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  try {
    const userSession = await validateSession(context);
    if (!userSession) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    const sql = neon(databaseUrl);

    if (request.method === "GET") {
      // Access Control: Admin and Technicians can view logs
      if (userSession.role_name !== "Admin" && userSession.role_name !== "Technician") {
        return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
      }

      const url = new URL(request.url);
      const module = url.searchParams.get("module") || null;
      const targetId = url.searchParams.get("target_id") || null;
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);

      let query;
      let params = [limit];

      let sqlQuery = `
        SELECT l.*, u.name as user_name 
        FROM logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
      `;

      if (module) {
        sqlQuery += ` AND l.module = ${'$' + (params.length + 1)}`;
        params.push(module);
      }

      if (targetId) {
        // Search in details JSONB for target_id, asset_id or ticket_id
        sqlQuery += ` AND (
          l.details->>'target_id' = ${'$' + (params.length + 1)} OR 
          l.details->>'asset_id' = ${'$' + (params.length + 1)} OR 
          l.details->>'ticket_id' = ${'$' + (params.length + 1)}
        )`;
        params.push(targetId);
      }

      sqlQuery += ` ORDER BY l.created_at DESC LIMIT $1`;

      // Use raw query for dynamic construction (or multiple templates)
      // Since it's a small set of params, I'll just use template literal with conditions
      const logs = await (targetId 
        ? (module 
            ? sql`SELECT l.*, u.name as user_name FROM logs l LEFT JOIN users u ON l.user_id = u.id WHERE l.module = ${module} AND (l.details->>'target_id' = ${targetId} OR l.details->>'asset_id' = ${targetId} OR l.details->>'ticket_id' = ${targetId}) ORDER BY l.created_at DESC LIMIT ${limit}`
            : sql`SELECT l.*, u.name as user_name FROM logs l LEFT JOIN users u ON l.user_id = u.id WHERE (l.details->>'target_id' = ${targetId} OR l.details->>'asset_id' = ${targetId} OR l.details->>'ticket_id' = ${targetId}) ORDER BY l.created_at DESC LIMIT ${limit}`)
        : (module
            ? sql`SELECT l.*, u.name as user_name FROM logs l LEFT JOIN users u ON l.user_id = u.id WHERE l.module = ${module} ORDER BY l.created_at DESC LIMIT ${limit}`
            : sql`SELECT l.*, u.name as user_name FROM logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT ${limit}`)
      );

      return new Response(JSON.stringify(logs), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Logs API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}

// Utility function to be used by other APIs (could be moved to a shared file later)
export async function logAction(sql, userId, module, action, details = {}) {
  try {
    await sql`
      INSERT INTO logs (user_id, module, action, details)
      VALUES (${userId}, ${module}, ${action}, ${JSON.stringify(details)})
    `;
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}
