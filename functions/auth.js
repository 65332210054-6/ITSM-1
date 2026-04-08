export async function validateSession(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer session-")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(env.DATABASE_URL);

  const sessions = await sql`
    SELECT s.user_id, u.name, u.email, r.name as role_name 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN roles r ON u.role_id = r.id 
    WHERE s.id = ${token} AND (s.expires_at IS NULL OR s.expires_at > NOW())
    LIMIT 1
  `;

  if (sessions.length === 0) {
    return null;
  }

  return sessions[0];
}
