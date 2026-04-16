import { validateSession } from "../auth.js";
import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  
  const session = await validateSession(context);

  if (!session) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const sql = neon(env.DATABASE_URL);

  try {
    if (request.method === "GET") {
      const settings = await sql`SELECT setting_key, setting_value FROM system_settings`;
      const config = {};
      settings.forEach(row => {
          // Smart conversion: if it's 'true' or 'false', return as boolean. Otherwise, return raw string.
          if (row.setting_value === 'true') config[row.setting_key] = true;
          else if (row.setting_value === 'false') config[row.setting_key] = false;
          else config[row.setting_key] = row.setting_value;
      });
      return new Response(JSON.stringify(config), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" || request.method === "PUT") {
      if (session.role_name !== "Admin") {
          return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
      }

      const body = await request.json();
      const { setting_key, setting_value } = body;

      if (!setting_key) {
        return new Response(JSON.stringify({ message: "Setting key is required" }), { status: 400 });
      }

      await sql`
        INSERT INTO system_settings (setting_key, setting_value, updated_at) 
        VALUES (${setting_key}, ${String(setting_value)}, NOW())
        ON CONFLICT (setting_key) DO UPDATE 
        SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      `;

      return new Response(JSON.stringify({ message: "Setting updated successfully" }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  } catch (error) {
    console.error("Settings API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}
