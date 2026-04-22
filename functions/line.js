/**
 * Line Notify Shared Utility
 * Fetches settings from system_settings and sends messages to Line.
 */
export async function sendLineNotify(sql, message) {
  try {
    // 1. Fetch Line settings from database
    const settingsRows = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('line_notify_enabled', 'line_notify_token')
    `;
    
    const settings = {};
    settingsRows.forEach(row => settings[row.setting_key] = row.setting_value);

    // 2. Check if enabled
    if (settings.line_notify_enabled !== 'true') {
      console.log("Line Notify is disabled in settings.");
      return false;
    }

    const token = settings.line_notify_token;
    if (!token || token.trim() === "") {
      console.error("Line Notify Token is missing in settings.");
      return false;
    }

    // 3. Send notification
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: new URLSearchParams({ 
        message: message.trim() 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Line Notify API Error (${response.status}):`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Line Notify Exception:", error);
    return false;
  }
}
