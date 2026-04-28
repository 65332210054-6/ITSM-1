import { neon } from '@neondatabase/serverless';
import { validateSession } from '../auth.js';
import { sendLineNotify } from '../line.js';

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) return new Response("DATABASE_URL is not set", { status: 500 });

  try {
    const url = new URL(request.url);
    const sql = neon(databaseUrl);

    // Auth Check: Allow if either valid session OR valid Cron Secret header
    const cronSecret = env.CRON_SECRET;
    const clientSecret = request.headers.get('X-Cron-Secret');
    
    let userSession = null;
    if (cronSecret && clientSecret === cronSecret) {
      userSession = { user_id: 'cron-job', name: 'System Cron' };
    } else {
      userSession = await validateSession(context);
      if (!userSession) return new Response("Unauthorized", { status: 401 });
    }

    // 1. Check Overdue Borrows
    const overdue = await sql`
      SELECT b.*, a.asset_tag, a.name as asset_name, u.name as borrower_name
      FROM borrows b
      JOIN assets a ON b.asset_id = a.id
      JOIN users u ON b.borrower_id = u.id
      WHERE b.status = 'Borrowed' AND b.due_date < NOW()
    `.catch(() => []);

    // 2. Check Expiring Domains
    const domains = await sql`
      SELECT name, expiration_date 
      FROM domains 
      WHERE expiration_date <= NOW() + INTERVAL '30 days' AND status = 'Active'
    `.catch(() => []);

    // 3. Check Expiring SSL
    const ssl = await sql`
      SELECT name, ssl_expiration 
      FROM domains 
      WHERE ssl_expiration <= NOW() + INTERVAL '30 days' AND status = 'Active'
    `.catch(() => []);

    // 4. Check Expiring Licenses
    const licenses = await sql`
      SELECT name, expiration_date 
      FROM licenses 
      WHERE expiration_date <= NOW() + INTERVAL '30 days' AND status = 'Active'
    `.catch(() => []);

    // Build Message
    if (overdue.length === 0 && domains.length === 0 && ssl.length === 0 && licenses.length === 0) {
      return new Response(JSON.stringify({ message: "No items to notify" }), { status: 200 });
    }

    let msg = "\n📊 [Daily IT Report - สรุปรายการสำคัญ]";
    
    if (overdue.length > 0) {
      msg += `\n\n⚠️ ของยืมเกินกำหนด (${overdue.length} รายการ):`;
      overdue.forEach(o => {
        msg += `\n- ${o.asset_tag}: ${o.asset_name} (${o.borrower_name})`;
      });
    }

    if (domains.length > 0) {
      msg += `\n\n🌐 Domain จะหมดอายุ (${domains.length} รายการ):`;
      domains.forEach(d => {
        msg += `\n- ${d.name} (${new Date(d.expiration_date).toLocaleDateString('th-TH')})`;
      });
    }

    if (ssl.length > 0) {
      msg += `\n\n🔐 SSL จะหมดอายุ (${ssl.length} รายการ):`;
      ssl.forEach(s => {
        msg += `\n- ${s.name} (${new Date(s.ssl_expiration).toLocaleDateString('th-TH')})`;
      });
    }

    if (licenses.length > 0) {
      msg += `\n\n🔑 License จะหมดอายุ (${licenses.length} รายการ):`;
      licenses.forEach(l => {
        msg += `\n- ${l.name} (${new Date(l.expiration_date).toLocaleDateString('th-TH')})`;
      });
    }

    msg += "\n\n💡 กรุณาตรวจสอบข้อมูลในระบบ ITSM";

    const success = await sendLineNotify(sql, msg);

    return new Response(JSON.stringify({ 
      success, 
      message: success ? "Notification sent" : "Failed to send Line Notify",
      stats: { overdue: overdue.length, domains: domains.length, ssl: ssl.length, licenses: licenses.length }
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Automated Notify Error:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
