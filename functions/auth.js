export async function validateSession(context, sqlInstance = null) {
  const { request, env } = context;
  let token;
  const authHeader = request.headers.get("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer session-")) {
    token = authHeader.split(" ")[1];
  } else {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token");
    if (queryToken && queryToken.startsWith("session-")) {
      token = queryToken;
    }
  }

  if (!token) return null;

  const sql = sqlInstance || (await import('@neondatabase/serverless')).neon(env.DATABASE_URL);

  const sessions = await sql`
    SELECT s.user_id, u.name, u.email, r.name as role_name 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN roles r ON u.role_id = r.id 
    WHERE s.id = ${token} AND (s.expires_at IS NULL OR s.expires_at > NOW())
    LIMIT 1
  `;

  return sessions[0] || null;
}

export async function checkModuleAccess(context, moduleKey, sqlInstance = null) {
  const sql = sqlInstance || (await import('@neondatabase/serverless')).neon(context.env.DATABASE_URL);
  const userSession = await validateSession(context, sql);
  if (!userSession) return null; // Unauthorized

  if (userSession.role_name === "Admin") return userSession;

  try {
    const settings = await sql`SELECT setting_value FROM system_settings WHERE setting_key = ${moduleKey} LIMIT 1`;
    let allowedRoles = ['Admin', 'Technician', 'User'];
    
    if (settings.length > 0) {
      const val = settings[0].setting_value;
      if (val === 'false') {
        allowedRoles = ['Admin'];
      } else if (val !== 'true') {
        allowedRoles = val.split(',').map(r => r.trim());
      }
    }

    if (allowedRoles.includes(userSession.role_name)) return userSession;
  } catch (error) {
    console.error(`Error checking module access (${moduleKey}):`, error);
  }

  return false; // Forbidden
}
