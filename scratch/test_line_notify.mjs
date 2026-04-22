import { neon } from '@neondatabase/serverless';

// Mocking the utility here since imports from functions/ might be tricky with standard node
async function sendLineNotify(sql, message) {
  try {
    const settingsRows = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('line_notify_enabled', 'line_notify_token')
    `;
    
    const settings = {};
    settingsRows.forEach(row => settings[row.setting_key] = row.setting_value);

    if (settings.line_notify_enabled !== 'true') {
      console.log("Line Notify is DISABLED in settings.");
      return false;
    }

    const token = settings.line_notify_token;
    if (!token) {
      console.log("Line Notify Token is EMPTY.");
      return false;
    }

    console.log(`Sending message with token: ${token.substring(0, 5)}...`);
    
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: new URLSearchParams({ message })
    });

    const data = await response.json();
    console.log("Response:", data);
    return data.status === 200;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}

const DATABASE_URL = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function runTest() {
  console.log("Checking Line Notify settings...");
  const settings = await sql`SELECT * FROM system_settings WHERE setting_key LIKE 'line_notify_%'`;
  console.log(settings);

  const result = await sendLineNotify(sql, "🚀 ทดสอบระบบแจ้งเตือน Line Notify จาก ITSM Admin");
  console.log("Result:", result ? "SUCCESS" : "FAILED (Expected if no token set yet)");
}

runTest();
