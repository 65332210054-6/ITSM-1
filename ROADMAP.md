# Roadmap การพัฒนาระบบ IT Management (Phase 2)

แผนงานสำหรับการพัฒนาในลำดูกถัดไป เพื่อยกระดับระบบให้สมบูรณ์และรองรับการใช้งานในระดับองค์กร

---

## 1. โมดูลใหม่ที่ต้องพัฒนา (New Modules)

### **1.1 IP Management (IPAM)**
- [x] ออกแบบ Database Schema สำหรับเก็บข้อมูล IP Address (IPv4, Subnet, Gateway, VLAN)
- [x] พัฒนา API `functions/api/ipam.js` (CRUD, Search, Reserve IP)
- [x] พัฒนา UI `public/ipam.html` (ตารางแสดงสถานะ IP, ฟอร์มจอง IP)
- [x] เชื่อมโยงข้อมูลกับโมดูล Assets (Mapping IP to Asset)

### **1.2 IT Consumables (วัสดุสิ้นเปลือง)**
- [x] ออกแบบ Database Schema สำหรับสินค้าสิ้นเปลือง (Mouse, Keyboard, Cable, Battery)
- [x] พัฒนา API `functions/api/consumables.js` (Stock In-Out, ประวัติการเบิก)
- [x] พัฒนา UI `public/consumables.html` (Dashboard สต็อก, ฟอร์มเบิกจ่าย)
- [x] ระบบแจ้งเตือน Low Stock (เตือนเมื่อของต่ำกว่าจุดวิกฤต)

---

## 2. ฟีเจอร์และการเชื่อมต่อระบบ (Integrations & Features)

### **2.1 Line Notify Integration**
- [x] พัฒนาโมดูลกลางสำหรับส่งข้อความไปยัง Line Group
- [x] ตั้งค่าการแจ้งเตือนอัตโนมัติ:
    - [x] แจ้งเตือนเมื่อมี Ticket ใหม่/ปิดงาน
    - [x] แจ้งเตือนเมื่อมีรายการยืมใหม่
    - [x] แจ้งเตือนรายวันสำหรับอุปกรณ์ที่ยืมเกินกำหนด (Overdue) - *Manual Trigger ready*
    - [x] แจ้งเตือนล่วงหน้า 30 วันก่อน Domain/SSL/License หมดอายุ - *Manual Trigger ready*

### **2.2 Expansion of Reports & Export**
- [x] อัปเดตหน้า `public/reports.html` ให้รองรับการ Export ข้อมูลในโมดูลที่เหลือ:
    - [x] Export Domains & SSL Data
    - [x] Export Cartridges & Toner Stock
    - [x] Export Software Licenses
    - [x] Export IPAM & Consumables
- [x] เพิ่มกราฟสรุปสถิติสำหรับโมดูลใหม่ (IPAM, Consumables)

---

## 3. การปรับปรุงประสิทธิภาพและความเสถียร (Maintenance & Cleanup)

- [x] **Cleanup**: ลบไฟล์ชั่วคราวในโฟลเดอร์ `scratch/` ที่ไม่ใช้แล้ว (`check_all_tables.js`, `check_branches.mjs`, `check_tickets.mjs`, `test_api_response.mjs`, `update_tickets_format.mjs`)
- [x] **Cleanup**: ลบ commented code เก่าออกจาก `functions/api/room-care.js` (repair_history block เก่า)
- [x] **Cleanup**: แก้ไข `incidents_history` filter pattern ให้ consistent กับ `repair_history`
- [x] **Cleanup**: ทำความสะอาด `rc-assignees.js` (stub file — replaced with documentation comment)
- [ ] **Bug Fix**: `finish_ticket` API reset `details` แบบ hardcode เมื่อปิด Ticket ทั้งหมด → ทำให้ Custom ระบบ (CCTV ฯลฯ) หาย
- [ ] **Bug Fix**: `add_room` / `add_floor` API ใส่ `details` เป็น hardcode 5 ระบบ → ควร dynamic จาก `rc_settings`
- [ ] **Regression Testing**: ทดสอบวงจรการซ่อม-ปิดงาน (Ticket Lifecycle) แบบครบวงจรอีกครั้ง
- [ ] **Security Audit**: ตรวจสอบการเช็คสิทธิ์ (RBAC) ในทุก API Endpoints ให้แน่ใจว่า Visitor ไม่สามารถแก้ไขข้อมูลได้

---

## 4. สถานะปัจจุบัน (Current Status)
- ✅ **Core Modules**: ทุกโมดูลหลักเสร็จสมบูรณ์ (Users, Assets, IPAM, Consumables, etc.)
- ✅ **Infrastructure**: Cloudflare Pages + Neon PostgreSQL (Stable)
- ✅ **Room Care Module**: ระบบบำรุงรักษาห้องพักเสร็จสมบูรณ์ (Branch, Room, Ticket, Inspection, Incident, Logs)
- ✅ **Maintenance Cleanup**: ลบ scratch files, ทำความสะอาด codebase เสร็จสิ้น
- ⏳ **Next Action**: แก้ Bug fix (hardcode details ใน room-care API), เพิ่ม Export Room Care ใน Reports, พัฒนา Dashboard KPI

---
*อัปเดตล่าสุดเมื่อ: 13 สิงหาคม 2569*
