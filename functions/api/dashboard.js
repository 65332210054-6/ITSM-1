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
      // Get Total Users (Always show count)
      let totalUsersNum = 0;
      try {
        const usersCount = await sql`SELECT COUNT(*) as count FROM users`;
        totalUsersNum = parseInt(usersCount[0].count);
      } catch (e) { totalUsersNum = 0; }
      
      // Get Total Assets (Always show count)
      let assetsCount = 0;
      try {
        const res = await sql`SELECT COUNT(*) as count FROM assets`;
        assetsCount = parseInt(res[0].count);
      } catch (e) { assetsCount = 0; }

      // Get Pending/Resolved Tickets (Always show count)
      let pendingTickets = 0;
      let resolvedThisMonth = 0;
      try {
        const resPending = await sql`SELECT COUNT(*) as count FROM tickets WHERE status != 'Resolved'`;
        pendingTickets = parseInt(resPending[0].count);
        
        const resResolved = await sql`SELECT COUNT(*) as count FROM tickets 
                              WHERE status = 'Resolved' 
                              AND updated_at >= date_trunc('month', now())`;
        resolvedThisMonth = parseInt(resResolved[0].count);
      } catch (e) { pendingTickets = 0; resolvedThisMonth = 0; }

      return new Response(JSON.stringify({
        totalUsers: totalUsersNum,
        totalAssets: assetsCount,
        pendingTickets: pendingTickets,
        resolvedThisMonth: resolvedThisMonth
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getAlerts") {
      const alerts = {
        overdueBorrows: 0,
        lowStockConsumables: 0,
        expiringLicenses: 0,
        expiringDomains: 0
      };

      try {
        // 1. Overdue Borrows
        const resOverdue = await sql`SELECT COUNT(*)::int as count FROM borrows WHERE status = 'Overdue'`;
        alerts.overdueBorrows = resOverdue[0].count;

        // 2. Low Stock Consumables
        const resLowStock = await sql`SELECT COUNT(*)::int as count FROM consumables WHERE quantity <= min_quantity`;
        alerts.lowStockConsumables = resLowStock[0].count;

        // 3. Expiring Licenses (< 30 days)
        const resExpLicenses = await sql`SELECT COUNT(*)::int as count FROM licenses WHERE expiration_date < now() + interval '30 days' AND status = 'Active'`;
        alerts.expiringLicenses = resExpLicenses[0].count;

        // 4. Expiring Domains (< 30 days)
        const resExpDomains = await sql`
          SELECT COUNT(*)::int as count FROM domains 
          WHERE (
            expiration_date < now() + interval '30 days'
            OR ssl_expiration < now() + interval '30 days'
            OR hosting_expiration < now() + interval '30 days'
          )
          AND status = 'Active'
        `;
        alerts.expiringDomains = resExpDomains[0].count;

        // 5. Unassigned Tickets (Critical/High only)
        const resUnassigned = await sql`
          SELECT COUNT(*)::int as count FROM tickets 
          WHERE assigned_to IS NULL 
          AND status = 'Pending'
          AND priority IN ('Critical', 'High')
        `;
        alerts.unassignedTickets = resUnassigned[0].count;

      } catch (e) {
        console.error("Dashboard Alerts Error:", e);
      }

      return new Response(JSON.stringify(alerts), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getMyTasks") {
      // Fetch tickets assigned to this user that are not Resolved or Closed
      const tasks = await sql`
        SELECT id, subject, priority, status, created_at 
        FROM tickets 
        WHERE assigned_to = ${userSession.user_id} 
        AND status NOT IN ('Resolved', 'Closed')
        ORDER BY 
          CASE WHEN priority = 'Critical' THEN 1
               WHEN priority = 'High' THEN 2
               WHEN priority = 'Medium' THEN 3
               ELSE 4 END,
          created_at DESC
        LIMIT 5
      `;
      
      return new Response(JSON.stringify(tasks), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getChartData") {
      // Asset categories distribution (Always show summary)
      let assetsByCategory = [];
      try {
        assetsByCategory = await sql`SELECT category, COUNT(*) as count FROM assets GROUP BY category`;
      } catch (e) { assetsByCategory = []; }

      // Ticket status distribution & trends (Always show summary)
      let ticketsByStatus = [];
      let ticketTrends = [];
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

      return new Response(JSON.stringify({
        assetsByCategory,
        ticketsByStatus,
        ticketTrends
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getRecentActivity") {
      const moduleList = [
        { id: 'Users', key: 'module_users_enabled' },
        { id: 'Assets', key: 'module_assets_enabled' },
        { id: 'Tickets', key: 'module_tickets_enabled' },
        { id: 'Borrows', key: 'module_borrows_enabled' },
        { id: 'Domains', key: 'module_domains_enabled' },
        { id: 'Cartridges', key: 'module_cartridges_enabled' },
        { id: 'Licenses', key: 'module_licenses_enabled' },
        { id: 'Reports', key: 'module_reports_enabled' },
        { id: 'Categories', key: 'module_categories_enabled' }
      ];

      const visibleModules = moduleList.filter(m => canSee(m.key)).map(m => m.id);
      
      // If none are visible and not admin, return empty
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
