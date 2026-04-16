# มาตรฐานการพยาบาลระบบ (ITSM Technical Development Standards)

เพื่อให้การพัฒนาระบบในอนาคตเป็นไปในทิศทางเดียวกัน มีประสิทธิภาพสูง และรักษาคุณภาพ UI/UX ระดับพรีเมียม ให้ยึดถือมาตรฐานดังต่อไปนี้เป็นเกณฑ์พื้นฐาน (Baseline):

## 1. มาตรฐานการพัฒนา Backend (API Standard)

การดึงข้อมูลรายการ (List) ทั้งหมดต้องรองรับ **Server-side Pagination & Search** เสมอ

- **Request Parameters:** ต้องรองรับ `page`, `limit` และ `search` (Query Strings)
- **Response Structure:** ต้องส่งกลับเป็น JSON Object ในรูปแบบนี้:
  ```json
  {
    "items": [...],
    "totalCount": 50,
    "totalPages": 5,
    "currentPage": 1,
    "limit": 10
  }
  ```
- **SQL Best Practice:** 
  - ใช้ `COUNT(*) OVER()` เพื่อดึงจำนวนรายการทั้งหมดใน Query เดียว
  - ใช้พารามิเตอร์แบบ Tagged Templates เพื่อป้องกัน SQL Injection
  - ใช้ `ILIKE` สำหรับการค้นหาแบบไม่สนตัวพิมพ์ใหญ่-เล็ก (Case-insensitive)

## 2. มาตรฐานการเข้าถึงข้อมูล (Logic Standard)

- **Search Debounce:** ห้ามเรียก API ทันทีที่ผู้ใช้พิมพ์ ต้องใช้ระบบ **Debounce 1 วินาที (1000ms)** เพื่อป้องกันการเรียก API ถี่เกินไป
- **State Management:** ทุกหน้าที่มีตารางต้องรักษาตัวแปรสถานะดังนี้:
  - `currentPage`, `itemsPerPage`
  - `totalItemsCount`, `totalPagesCount`
- **Error Handling:** ต้องแสดงข้อความ Error ที่อ่านง่ายแก่ผู้ใช้เมื่อ API ทำงานผิดพลาด

## 3. มาตรฐาน UI/UX (Design System)

- **Pagination Buttons:** 
    - ใช้คลาสมาตรฐาน: `.pagination-btn`, `.pagination-btn-active`, `.pagination-btn-nav`
    - ต้องมี **Tactile Feedback**: เพิ่ม `active:scale-95` หรือ `active:scale-90` เพื่อให้ปุ่มรู้สึกเหมือนถูกกดจริง
    - **Visible Pages:** กำหนดให้แสดงเลขหน้าสูงสุด **5 หน้า (maxVisiblePages = 5)** เพื่อความสะดวกในการเปลี่ยนหน้าและความสม่ำเสมอทั้งระบบ
- **Dropdowns (Choices.js):** 
  - เมื่อมีการเปลี่ยนแปลงข้อมูลแบบ Cascade (เช่นเปลี่ยนสาขาแล้วแผนกเปลี่ยนตาม) ให้ใช้เทคนิค **"Rebuild Native Options + Targeted Re-init"**
  - ตัวอย่าง: อัปเดต `innerHTML` ของ `<select>` เดิมแล้วเรียก `ui.initChoices(targetElement)`

## 4. มาตรฐานความปลอดภัย (Security Standard)

- **RBAC (Role-Based Access Control):** ทุก API ต้องมีการตรวจสอบสิทธิ์ผ่าน `validateSession` และเช็คบทบาท (`role_name`) ก่อนดำเนินการ
- **Data Sanitization:** ใช้หน้าเว็บที่หนีอักขระ (Escape HTML) เมื่อแสดงข้อมูลที่มาจากผู้ใช้เพื่อป้องกัน XSS

---

> [!NOTE]
> **เป้าหมาย:** มาตรฐานนี้จัดทำขึ้นเพื่อให้ระบบมีความลื่นไหลเหมือนแอปพลิเคชันระดับ Enterprise และง่ายต่อการส่งต่องานหรือขยายผลในอนาคตครับ
