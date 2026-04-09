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
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "getStats") {
      // Get Total Users
      const usersCount = await sql`SELECT COUNT(*) as count FROM users`;
      
      // Get Total Assets (Assuming assets table exists or we will create it)
      // For now, if table doesn't exist, we return 0
      let assetsCount = 0;
      try {
        const res = await sql`SELECT COUNT(*) as count FROM assets`;
        assetsCount = res[0].count;
      } catch (e) { assetsCount = 0; }

      // Get Pending Tickets
      let pendingTickets = 0;
      try {
        const res = await sql`SELECT COUNT(*) as count FROM tickets WHERE status != 'Resolved'`;
        pendingTickets = res[0].count;
      } catch (e) { pendingTickets = 0; }

      // Get Resolved This Month
      let resolvedThisMonth = 0;
      try {
        const res = await sql`SELECT COUNT(*) as count FROM tickets 
                              WHERE status = 'Resolved' 
                              AND updated_at >= date_trunc('month', now())`;
        resolvedThisMonth = res[0].count;
      } catch (e) { resolvedThisMonth = 0; }

      return new Response(JSON.stringify({
        totalUsers: parseInt(usersCount[0].count),
        totalAssets: parseInt(assetsCount),
        pendingTickets: parseInt(pendingTickets),
        resolvedThisMonth: parseInt(resolvedThisMonth)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "getChartData") {
      // Asset categories distribution
      let assetsByCategory = [];
      try {
        assetsByCategory = await sql`SELECT category, COUNT(*) as count FROM assets GROUP BY category`;
      } catch (e) { assetsByCategory = []; }

      // Ticket status distribution
      let ticketsByStatus = [];
      try {
        ticketsByStatus = await sql`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`;
      } catch (e) { ticketsByStatus = []; }

      // Ticket trends (Last 6 months)
      let ticketTrends = [];
      try {
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
      } catch (e) { ticketTrends = []; }

      return new Response(JSON.stringify({
        assetsByCategory,
        ticketsByStatus,
        ticketTrends
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "Action not found" }), { status: 404 });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}
