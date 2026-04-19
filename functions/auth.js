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

export async function checkModuleAccess(context, moduleKey, action = 'view', sqlInstance = null) {
  const sql = sqlInstance || (await import('@neondatabase/serverless')).neon(context.env.DATABASE_URL);
  const userSession = await validateSession(context, sql);
  if (!userSession) return null; // Unauthorized

  // Admin always has access to everything
  if (userSession.role_name === "Admin") return userSession;

  try {
    // Handle legacy calls that pass 'module_xxx_enabled'
    let baseKey = moduleKey;
    if (moduleKey.startsWith('module_') && moduleKey.endsWith('_enabled')) {
      baseKey = moduleKey.replace('module_', '').replace('_enabled', '');
    }

    // Setting key pattern: module_users_roles_view, module_users_roles_create, etc.
    const settingKey = `module_${baseKey}_roles_${action}`;
    const legacyKey = `module_${baseKey}_enabled`;

    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN (${settingKey}, ${legacyKey})
    `;
    
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

    let val = settingsMap[settingKey];

    // Only fallback to legacyKey if action is 'view'
    if (val === undefined && action === 'view') {
      val = settingsMap[legacyKey];
    }

    // If no setting is found, default to true for 'view', false for others (Admin still gets access via top check)
    if (val === undefined) {
      return action === 'view' ? userSession : false;
    }
    
    if (val === 'true' || val === '') return userSession;
    if (val === 'false') return false;

    // Check specific roles
    const allowedRoles = String(val).split(',').map(r => r.trim());
    if (allowedRoles.includes(userSession.role_name)) return userSession;
    
  } catch (error) {
    console.error(`Error checking module access (${moduleKey}, ${action}):`, error);
  }

  return false; // Forbidden
}
