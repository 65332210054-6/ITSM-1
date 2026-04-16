# คู่มือสรุปภาพรวมระบบ (IT Management System Documentation)

เอกสารฉบับนี้รวบรวมรายละเอียดโมดูลการใช้งาน และระบบความปลอดภัยทั้งหมดที่มีอยู่ในปัจจุบัน เพื่อเป็นฐานข้อมูลสำหรับการรับรองและพัฒนาระบบต่อในอนาคต

---

## 1. ข้อมูลทางเทคนิค (Technical Stack)
- **Frontend:** HTML5, Javascript (Vanilla), Tailwind CSS (via CDN), CSS3 (Custom Premium Styles)
- **Backend:** Cloudflare Pages Functions (Serverless)
- **Database:** Neon PostgreSQL (Serverless)
- **Authentication:** Token-based Session Management (JWT-like logic)

---

## 2. โมดูลการใช้งานที่มีในปัจจุบัน (Active Modules)

### 2.1 แดชบอร์ดภาพรวม (Dashboard)
- แสดงสถิติจำนวนพนักงาน, ทรัพย์สินไอที และสถานะงานแจ้งซ่อมแบบ Real-time
- กราฟวงกลมแยกประเภททรัพย์สิน และกราฟแท่งแสดงแนวโน้มงานแจ้งซ่อม (Chart.js)
- กิจกรรมล่าสุด (Recent Activity) ติดตามทุกความเคลื่อนไหวในระบบ

### 2.2 จัดการพนักงาน (User Management)
- ระบบจัดการข้อมูลพนักงาน (เพิ่ม/แก้ไข/ลบ/ระงับสิทธิ์)
- **มาตรฐานใหม่:** Server-side Pagination และระบบค้นหาแบบขั้นสูง
- กำหนดสิทธิ์การใช้งาน (Admin, Technician, User)

### 2.3 จัดการทรัพย์สิน (Asset Management)
- ระบบบันทึกทรัพย์สินไอที (Asset Tag, S/N, หมวดหมู่, ผู้ครอบครอง)
- ติดตามประวัติการซ่อมรายทรัพย์สินในหน้า Detail
- **มาตรฐานใหม่:** Server-side Pagination และระบบค้นหาพร้อมหน่วงเวลา (Search Debounce)

### 2.4 ระบบแจ้งซ่อมและบริการ (Helpdesk / Tickets)
- ระบบเปิดใบงานแจ้งซ่อม (Subject, Description, Priority, Asset Mapping)
- ระบบมอบหมายงานให้ช่าง (Assigned to) และอัปเดตสถานะงาน
- ระบบสิทธิ์การเห็นข้อมูล (User เห็นเฉพาะของตน / Staff เห็นทั้งหมด)

### 2.5 ตั้งค่าระบบ (System Settings)
- จัดการโครงสร้างองค์กร (สาขา และ แผนก)
- **ใหม่:** ระบบจัดการสิทธิ์เข้าถึงรายโมดูล (Granular Module Access) สามารถระบุบทบาท (Technician, User) ที่มีสิทธิ์เข้าถึงแต่ละโมดูลได้อิสระ
- ระบบ Cascading Dropdown (เลือกสาขา -> แผนกเปลี่ยนตาม) ที่เสถียร 100%

---

## 3. ระบบความปลอดภัยและการป้องกันการโจมตี (Security Pillars)

| ประเภทการป้องกัน | รายละเอียดการดำเนินงาน |
| :--- | :--- |
| **SQL Injection** | ใช้ **Parameterized Queries** (Neon SQL Tagged Templates) ทุกจุด ห้ามการต่อ String ในคำสั่ง SQL โดยเด็ดขาด |
| **Authentication** | ระบบตรวจสอบ **Session Token** ทุกครั้งที่เรียก API ผ่าน Middleware `validateSession` |
| **Authorization (RBAC)** | การเช็คสิทธิ์ระดับบทบาท (Role-based) ในฝั่ง Server ก่อนเริ่มกระบวนการลบหรือแก้ไขข้อมูลสำคัญ |
| **Module Access Control** | **(อัปเกรด)** ระบบตรวจสอบสิทธิ์เข้าถึงรายโมดูลตามบทบาท (Granular Permissions) โดย Admin เข้าถึงได้ทุกอย่างเสมอ |
| **XSS Protection** | ใช้ฟังก์ชัน `escapeHTML` ในการล้างสคริปต์อันตรายก่อนแสดงผลข้อมูลที่ผู้ใช้พิมพ์เข้ามา |
| **Rate Limiting (Soft)** | ระบบ **Search Debounce (1s)** ช่วยป้องกันการถล่มคำสั่งค้นหาใส่เซิร์ฟเวอร์ถี่เกินไป |
| **Audit Trail** | ระบบ **Action Logging** บันทึกทุกกิจกรรมที่มีการแก้ไขข้อมูลลงฐานข้อมูล (LogAction) |

---

## 4. มาตรฐาน UI/UX ระดับพรีเมียม (Design Standards)

- **Tactile UI:** ปุ่มกดทุกจุดมี Animation ตอบสนอง (Scale Down) ให้ความรู้สึกเหมือนกดปุ่มจริง
- **Premium Pagination:** ระบบนำทางหน้าที่ชัดเจน แสดงเลขหน้าสูงสุด 5 หน้า (maxVisiblePages: 5)
- **Responsive Design:** รองรับการใช้งานมือถือ (Mobile Sidebar) และเดสก์ท็อปอย่างสมบูรณ์

---

*เอกสารฉบับนี้ปรับปรุงล่าสุดเมื่อ: 12 เมษายน 2026*
