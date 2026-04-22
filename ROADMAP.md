# Roadmap การพัฒนาระบบ IT Management (Phase 2)

แผนงานสำหรับการพัฒนาในลำดูกถัดไป เพื่อยกระดับระบบให้สมบูรณ์และรองรับการใช้งานในระดับองค์กร

---

## 1. โมดูลใหม่ที่ต้องพัฒนา (New Modules)

### **1.1 IP Management (IPAM)**
- [ ] ออกแบบ Database Schema สำหรับเก็บข้อมูล IP Address (IPv4, Subnet, Gateway, VLAN)
- [ ] พัฒนา API `functions/api/ipam.js` (CRUD, Search, Reserve IP)
- [ ] พัฒนา UI `public/ipam.html` (ตารางแสดงสถานะ IP, ฟอร์มจอง IP)
- [ ] เชื่อมโยงข้อมูลกับโมดูล Assets (Mapping IP to Asset)

### **1.2 IT Consumables (วัสดุสิ้นเปลือง)**
- [ ] ออกแบบ Database Schema สำหรับสินค้าสิ้นเปลือง (Mouse, Keyboard, Cable, Battery)
- [ ] พัฒนา API `functions/api/consumables.js` (Stock In-Out, ประวัติการเบิก)
- [ ] พัฒนา UI `public/consumables.html` (Dashboard สต็อก, ฟอร์มเบิกจ่าย)
- [ ] ระบบแจ้งเตือน Low Stock (เตือนเมื่อของต่ำกว่าจุดวิกฤต)

---

## 2. ฟีเจอร์และการเชื่อมต่อระบบ (Integrations & Features)

### **2.1 Line Notify Integration**
- [ ] พัฒนาโมดูลกลางสำหรับส่งข้อความไปยัง Line Group
- [ ] ตั้งค่าการแจ้งเตือนอัตโนมัติ:
    - แจ้งเตือนเมื่อมี Ticket ใหม่/ปิดงาน
    - แจ้งเตือนเมื่อมีรายการยืมใหม่
    - แจ้งเตือนรายวันสำหรับอุปกรณ์ที่ยืมเกินกำหนด (Overdue)
    - แจ้งเตือนล่วงหน้า 30 วันก่อน Domain/SSL/License หมดอายุ

### **2.2 Expansion of Reports & Export**
- [ ] อัปเดตหน้า `public/reports.html` ให้รองรับการ Export ข้อมูลในโมดูลที่เหลือ:
    - Export Domains & SSL Data
    - Export Cartridges & Toner Stock
    - Export Software Licenses
- [ ] เพิ่มกราฟสรุปสถิติสำหรับโมดูลใหม่ (IPAM, Consumables)

---

## 3. การปรับปรุงประสิทธิภาพและความเสถียร (Maintenance & Cleanup)

- [ ] **Cleanup**: ลบไฟล์ชั่วคราวในโฟลเดอร์ `scratch/` ที่ไม่ใช้แล้ว (เช่น `fix_borrows.mjs`, `debug_users.mjs`)
- [ ] **Regression Testing**: ทดสอบวงจรการยืม-คืน (Borrow Lifecycle) แบบครบวงจรอีกครั้ง
- [ ] **Security Audit**: ตรวจสอบการเช็คสิทธิ์ (RBAC) ในทุก API Endpoints ให้แน่ใจว่า Visitor ไม่สามารถแก้ไขข้อมูลได้

---

## 4. สถานะปัจจุบัน (Current Status)
- ✅ **Core Modules**: Users, Assets, Tickets, Borrows, Domains, Cartridges, Licenses, Reports, Settings (เสร็จสมบูรณ์)
- ✅ **Infrastructure**: Cloudflare Pages + Neon PostgreSQL (เสถียร 100%)
- ⏳ **Next Action**: เริ่มต้นโมดูล IP Management และระบบแจ้งเตือน Line Notify

---
*อัปเดตล่าสุดเมื่อ: 22 เมษายน 2026*
