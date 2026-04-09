import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// DATABASE_URL จาก db_check_final.mjs ที่ใช้งานได้
const DATABASE_URL = 'postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function seed() {
  console.log('🚀 Starting Seeding Process...');

  try {
    // 1. Get Roles and Departments
    const roles = await sql`SELECT id, name FROM roles`;
    const depts = await sql`SELECT id, name FROM departments`;

    if (roles.length === 0 || depts.length === 0) {
      console.log('❌ Roles or Departments not found.');
      return;
    }

    const adminRole = roles.find(r => r.name === 'Admin');
    const userRole = roles.find(r => r.name === 'User');
    const techRole = roles.find(r => r.name === 'Technician');

    // 2. Generate 100 Users
    console.log('👥 Generating 100 Users...');
    const hashedPass = await bcrypt.hash('password123', 10);
    const users = [];
    const firstNames = ['Somchai', 'Somsak', 'Somsri', 'Wichai', 'Anan', 'Prasert', 'Narong', 'Malee', 'Kanya', 'Thana'];
    const lastNames = ['Jaidee', 'Rakthai', 'Mankong', 'Sooksawat', 'Boonmee', 'Thongdee', 'Rattanaporn', 'Wattana'];

    for (let i = 1; i <= 100; i++) {
      const id = crypto.randomUUID();
      const fname = firstNames[i % firstNames.length];
      const lname = lastNames[Math.floor(i / 10) % lastNames.length];
      const name = `${fname} ${lname} (${i})`;
      const email = `user${i}@example.com`;
      const roleId = i <= 5 ? adminRole.id : (i <= 15 ? techRole.id : userRole.id);
      const deptId = depts[i % depts.length].id;
      
      users.push({ id, name, email, roleId, deptId });
      
      await sql`
        INSERT INTO users (id, name, email, role_id, department_id, password, created_at, updated_at)
        VALUES (${id}, ${name}, ${email}, ${roleId}, ${deptId}, ${hashedPass}, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `;
    }
    console.log('✅ Users Seeding Done.');

    // 3. Generate 100 Assets
    console.log('💻 Generating 100 Assets...');
    const categories = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Mobile', 'Network'];
    const statuses = ['In Use', 'Available', 'Repairing', 'Broken'];
    const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Samsung'];
    
    const assetIds = [];
    for (let i = 1; i <= 100; i++) {
      const id = crypto.randomUUID();
      const tag = `ASSET-TEST-${String(i).padStart(3, '0')}`;
      const sn = `SN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      const cat = categories[i % categories.length];
      const brand = brands[i % brands.length];
      const name = `${brand} ${cat} Pro ${i}`;
      const status = statuses[i % statuses.length];
      const assignedUser = status === 'In Use' ? users[i % users.length] : null;
      const assignedTo = assignedUser ? assignedUser.id : null;
      const deptId = assignedUser ? assignedUser.deptId : depts[i % depts.length].id;

      assetIds.push(id);
      await sql`
        INSERT INTO assets (id, asset_tag, serial_number, name, category, status, assigned_to, department_id, created_at, updated_at)
        VALUES (${id}, ${tag}, ${sn}, ${name}, ${cat}, ${status}, ${assignedTo}, ${deptId}, NOW(), NOW())
        ON CONFLICT (asset_tag) DO NOTHING
      `;
    }
    console.log('✅ Assets Seeding Done.');

    // 4. Generate 100 Tickets
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
      const reporter = users[i % users.length];
      const assetId = i % 2 === 0 ? assetIds[i % assetIds.length] : null;
      const techUser = users.find(u => u.roleId === techRole.id || u.roleId === adminRole.id);
      const techId = (status !== 'Open') ? techUser.id : null;

      await sql`
        INSERT INTO tickets (id, subject, description, status, priority, reporter_id, assigned_to, asset_id, created_at, updated_at)
        VALUES (${id}, ${subject}, ${desc}, ${status}, ${priority}, ${reporter.id}, ${techId}, ${assetId}, NOW(), NOW())
      `;
    }
    console.log('✅ Tickets Seeding Done.');

    console.log('✨ ALL SEEDING PROCESS COMPLETED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Seeding Error:', err);
  }
}

seed();
