import { neon } from '@neondatabase/serverless';
import { validateSession, checkModuleAccess } from '../auth.js';

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
    
    // Check module visibility for data pruning
    const settingsRaw = await sql`SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'module_%'`;
    const settings = {};
    settingsRaw.forEach(r => settings[r.setting_key] = r.setting_value);

    const canSee = (key) => {
        if (userSession.role_name === 'Admin') return true;
        const val = settings[key];
        if (val === 'false') return false;
        if (val === 'true' || !val) return true;
        return val.split(',').map(r => r.trim()).includes(userSession.role_name);
    };

    const usersVisible = canSee('module_users_enabled');
    const assetsVisible = canSee('module_assets_enabled');
    const ticketsVisible = canSee('module_tickets_enabled');
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "getStats") {
      // Get Total Users
      let totalUsersNum = 0;
      if (usersVisible) {
        const usersCount = await sql`SELECT COUNT(*) as count FROM users`;
        totalUsersNum = parseInt(usersCount[0].count);
      }
      
      // Get Total Assets
      let assetsCount = 0;
      if (assetsVisible) {
        try {
          const res = await sql`SELECT COUNT(*) as count FROM assets`;
          assetsCount = parseInt(res[0].count);
        } catch (e) { assetsCount = 0; }
      }

      // Get Pending Tickets
      let pendingTickets = 0;
      let resolvedThisMonth = 0;
      if (ticketsVisible) {
        try {
          const resPending = await sql`SELECT COUNT(*) as count FROM tickets WHERE status != 'Resolved'`;
          pendingTickets = parseInt(resPending[0].count);
          
          const resResolved = await sql`SELECT COUNT(*) as count FROM tickets 
                                WHERE status = 'Resolved' 
                                AND updated_at >= date_trunc('month', now())`;
          resolvedThisMonth = parseInt(resResolved[0].count);
        } catch (e) { pendingTickets = 0; resolvedThisMonth = 0; }
      }

      return new Response(JSON.stringify({
        totalUsers: totalUsersNum,
        totalAssets: assetsCount,
        pendingTickets: pendingTickets,
        resolvedThisMonth: resolvedThisMonth
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getChartData") {
      // Asset categories distribution
      let assetsByCategory = [];
      if (assetsVisible) {
        try {
          assetsByCategory = await sql`SELECT category, COUNT(*) as count FROM assets GROUP BY category`;
        } catch (e) { assetsByCategory = []; }
      }

      // Ticket status distribution
      let ticketsByStatus = [];
      let ticketTrends = [];
      if (ticketsVisible) {
        try {
          ticketsByStatus = await sql`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`;
          
          ticketTrends = await sql`
            SELECT 
              to_char(created_at, 'Mon YYYY') as month,
              COUNT(*) as count,
              min(created_at) as sort_date
            FROM tickets
            WHERE created_at >= now() - interval '6 months'
            GROUP BY month
            ORDER BY sort_date ASC
          `;
        } catch (e) { ticketsByStatus = []; ticketTrends = []; }
      }

      return new Response(JSON.stringify({
        assetsByCategory,
        ticketsByStatus,
        ticketTrends
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getRecentActivity") {
      const visibleModules = [];
      if (usersVisible) visibleModules.push('Users');
      if (assetsVisible) visibleModules.push('Assets');
      if (ticketsVisible) visibleModules.push('Tickets');
      
      // If none are visible and not admin, return empty (though sidebar would hide dashboard anyway)
      if (visibleModules.length === 0 && userSession.role_name !== 'Admin') {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
      }

      let recentLogs;
      if (userSession.role_name === 'Admin') {
        recentLogs = await sql`
          SELECT l.*, u.name as user_name 
          FROM logs l
          LEFT JOIN users u ON l.user_id = u.id
          ORDER BY l.created_at DESC
          LIMIT 5
        `;
      } else {
        recentLogs = await sql`
          SELECT l.*, u.name as user_name 
          FROM logs l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.module = ANY(${visibleModules})
          ORDER BY l.created_at DESC
          LIMIT 5
        `;
      }
      
      return new Response(JSON.stringify(recentLogs), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "Action not found" }), { status: 404 });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}
