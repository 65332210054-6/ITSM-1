import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function seedTickets() {
  console.log('🚀 Starting Seeding Tickets...');

  try {
    const roles = await sql`SELECT id, name FROM roles`;
    const techRole = roles.find(r => r.name === 'Technician');
    const adminRole = roles.find(r => r.name === 'Admin');

    const users = await sql`SELECT id, role_id FROM users`;
    const assetIds = (await sql`SELECT id FROM assets`).map(a => a.id);

    console.log('🎫 Generating 100 Tickets...');
    const subjects = [
      'คอมพิวเตอร์เปิดไม่ติด', 'อินเทอร์เน็ตช้ามาก', 'พิมพ์งานไม่ได้', 
      'ลืมรหัสผ่าน', 'ขอติดตั้งโปรแกรมใหม่', 'หน้าจอมีเส้น', 
      'เมาส์เสีย', 'คีย์บอร์ดพิมพ์ไม่ติด', 'เครื่องร้อนผิดปกติ', 'ต้องการอัปเกรด RAM'
    ];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const ticketStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

    for (let i = 1; i <= 100; i++) {
      const id = crypto.randomUUID();
      const subject = subjects[i % subjects.length] + ` #${i}`;
      const desc = `รายละเอียดปัญหาที่พบลำดับที่ ${i}: รบกวนช่วยตรวจสอบด้วยครับ พบปัญหาเมื่อวานนี้`;
      const priority = priorities[i % priorities.length];
      const status = ticketStatuses[i % ticketStatuses.length];
      const reporterId = users[i % users.length].id;
      const assetId = i % 2 === 0 ? assetIds[i % assetIds.length] : null;
      
      const techUser = users.find(u => u.role_id === techRole.id || u.role_id === adminRole.id);
      const techId = (status !== 'Open') ? techUser.id : null;

      await sql`
        INSERT INTO tickets (id, subject, description, status, priority, reporter_id, assigned_to, asset_id, created_at, updated_at)
        VALUES (${id}, ${subject}, ${desc}, ${status}, ${priority}, ${reporterId}, ${techId}, ${assetId}, NOW(), NOW())
      `;
    }
    console.log('✅ 100 Tickets Seeding Done.');
  } catch (err) {
    console.error('❌ Ticket Seeding Error:', err);
  }
}

seedTickets();
