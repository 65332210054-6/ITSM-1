import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create Categories
  const catComputer = await prisma.assetCategory.upsert({
    where: { name: "คอมพิวเตอร์" },
    update: {},
    create: { name: "คอมพิวเตอร์", description: "Desktop / Laptop" },
  })
  const catMonitor = await prisma.assetCategory.upsert({
    where: { name: "จอภาพ" },
    update: {},
    create: { name: "จอภาพ", description: "Monitor / Display" },
  })
  const catPrinter = await prisma.assetCategory.upsert({
    where: { name: "เครื่องพิมพ์" },
    update: {},
    create: { name: "เครื่องพิมพ์", description: "Printer / MFP" },
  })
  const catNetwork = await prisma.assetCategory.upsert({
    where: { name: "อุปกรณ์เครือข่าย" },
    update: {},
    create: { name: "อุปกรณ์เครือข่าย", description: "Router / Switch / AP" },
  })

  console.log("✅ Categories created")

  // Create Branches
  const branch = await prisma.branch.upsert({
    where: { code: "HQ" },
    update: {},
    create: { code: "HQ", name: "สำนักงานใหญ่", address: "กรุงเทพมหานคร", isMain: true },
  })
  await prisma.branch.upsert({
    where: { code: "BR01" },
    update: {},
    create: { code: "BR01", name: "สาขาเชียงใหม่", address: "จ.เชียงใหม่", isMain: false },
  })

  // Create Departments
  const deptIT = await prisma.department.upsert({
    where: { code: "IT" },
    update: {},
    create: { code: "IT", name: "แผนก IT", description: "Information Technology" },
  })
  await prisma.department.upsert({
    where: { code: "HR" },
    update: {},
    create: { code: "HR", name: "แผนกบุคคล", description: "Human Resources" },
  })
  await prisma.department.upsert({
    where: { code: "ACC" },
    update: {},
    create: { code: "ACC", name: "แผนกบัญชี", description: "Accounting & Finance" },
  })

  console.log("✅ Branch & Department created")

  // Create Roles
  const roleAdmin = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", description: "System Administrator" },
  })
  const roleTech = await prisma.role.upsert({
    where: { name: "Technician" },
    update: {},
    create: { name: "Technician", description: "IT Technician" },
  })
  const roleUser = await prisma.role.upsert({
    where: { name: "User" },
    update: {},
    create: { name: "User", description: "General Staff" },
  })

  // Create Users
  const hashedPassword = await bcrypt.hash("1234", 10)
  
  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: { password: hashedPassword, roleId: roleAdmin.id },
    create: {
      name: "Administrator",
      email: "admin@company.com",
      password: hashedPassword,
      roleId: roleAdmin.id,
      branchId: branch.id,
      departmentId: deptIT.id
    }
  })
  
  const techUser = await prisma.user.upsert({
    where: { email: "tech@company.com" },
    update: { password: hashedPassword, roleId: roleTech.id },
    create: {
      name: "สมชาย ช่างซ่อม",
      email: "tech@company.com",
      password: hashedPassword,
      roleId: roleTech.id,
      branchId: branch.id,
      departmentId: deptIT.id
    }
  })
  
  await prisma.user.upsert({
    where: { email: "user@company.com" },
    update: { password: hashedPassword, roleId: roleUser.id },
    create: {
      name: "สมหญิง พนักงาน",
      email: "user@company.com",
      password: hashedPassword,
      roleId: roleUser.id,
      branchId: branch.id,
      departmentId: deptIT.id
    }
  })
  
  console.log(`✅ 3 Mock Users created with password: '1234'`)

  // Create Assets
  const assets = [
    { assetCode: "COM-2026-0001", name: "Dell OptiPlex 7090", categoryId: catComputer.id, branchId: branch.id, status: "ACTIVE", brand: "Dell", model: "OptiPlex 7090", price: 32500 },
    { assetCode: "COM-2026-0002", name: "HP ProBook 450 G9", categoryId: catComputer.id, branchId: branch.id, status: "ACTIVE", brand: "HP", model: "ProBook 450 G9", price: 28900 },
    { assetCode: "COM-2026-0003", name: "Lenovo ThinkPad T14", categoryId: catComputer.id, branchId: branch.id, status: "IN_REPAIR", brand: "Lenovo", model: "ThinkPad T14", price: 35000 },
    { assetCode: "MON-2026-0001", name: "Dell P2422H 24 นิ้ว", categoryId: catMonitor.id, branchId: branch.id, status: "ACTIVE", brand: "Dell", model: "P2422H", price: 7500 },
    { assetCode: "MON-2026-0002", name: "LG 27UK850 27 นิ้ว", categoryId: catMonitor.id, branchId: branch.id, status: "ACTIVE", brand: "LG", model: "27UK850", price: 12900 },
    { assetCode: "PRT-2026-0001", name: "HP LaserJet Pro M404dn", categoryId: catPrinter.id, branchId: branch.id, status: "ACTIVE", brand: "HP", model: "M404dn", price: 9900 },
    { assetCode: "PRT-2026-0002", name: "Epson L3250", categoryId: catPrinter.id, branchId: branch.id, status: "BROKEN", brand: "Epson", model: "L3250", price: 4990 },
    { assetCode: "NET-2026-0001", name: "Cisco SG350-28 Switch", categoryId: catNetwork.id, branchId: branch.id, status: "ACTIVE", brand: "Cisco", model: "SG350-28", price: 18500 },
    { assetCode: "NET-2026-0002", name: "UniFi AP AC Pro", categoryId: catNetwork.id, branchId: branch.id, status: "ACTIVE", brand: "Ubiquiti", model: "UAP-AC-PRO", price: 5900 },
  ]

  for (const a of assets) {
    await prisma.asset.upsert({
      where: { assetCode: a.assetCode },
      update: {},
      create: a,
    })
  }

  console.log("✅ 9 Assets created")

  // Create Spare Parts
  const parts = [
    { code: "SP-001", name: "พัดลม CPU Intel", category: "อุปกรณ์คอม", pricePerUnit: 350, quantity: 5, minStock: 3 },
    { code: "SP-002", name: "RAM DDR4 8GB", category: "อุปกรณ์คอม", pricePerUnit: 890, quantity: 2, minStock: 3 },
    { code: "SP-003", name: "SSD 256GB SATA", category: "อุปกรณ์คอม", pricePerUnit: 1200, quantity: 4, minStock: 2 },
    { code: "SP-004", name: "สาย LAN Cat6 3m", category: "เครือข่าย", pricePerUnit: 65, quantity: 20, minStock: 10 },
    { code: "SP-005", name: "เมาส์ USB Logitech", category: "อุปกรณ์ต่อพ่วง", pricePerUnit: 290, quantity: 8, minStock: 5 },
  ]

  for (const p of parts) {
    await prisma.sparePart.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
  }

  console.log("✅ 5 Spare Parts created")

  // Create Cartridges
  const carts = [
    { model: "HP 76A", color: "Black", type: "Original", price: 2800, quantity: 3, minStock: 2, printerModels: "HP LaserJet Pro M404dn" },
    { model: "HP 76A (เทียบ)", color: "Black", type: "Compatible", price: 890, quantity: 1, minStock: 2, printerModels: "HP LaserJet Pro M404dn" },
    { model: "Epson 003 Black", color: "Black", type: "Original", price: 259, quantity: 4, minStock: 2, printerModels: "Epson L3250" },
    { model: "Epson 003 Cyan", color: "Cyan", type: "Original", price: 259, quantity: 2, minStock: 2, printerModels: "Epson L3250" },
  ]

  await prisma.cartridge.deleteMany({})
  for (const c of carts) {
    await prisma.cartridge.create({ data: c })
  }

  console.log("✅ 4 Cartridges created")

  // Create Tickets
  const assetCom3 = await prisma.asset.findUnique({ where: { assetCode: "COM-2026-0003" } })
  const assetPrt2 = await prisma.asset.findUnique({ where: { assetCode: "PRT-2026-0002" } })

  const tickets = [
    { jobId: "TK-2026-0001", title: "คอมเปิดไม่ติด", description: "กดปุ่ม Power แล้วไม่มีไฟ ไม่มีเสียงพัดลม", priority: "HIGH", status: "IN_PROGRESS", assetId: assetCom3?.id, technicianId: techUser.id },
    { jobId: "TK-2026-0002", title: "ปริ้นเตอร์กระดาษติด", description: "กระดาษติดบ่อยครั้ง ลองดึงแล้วยังติดอีก", priority: "MEDIUM", status: "OPEN", assetId: assetPrt2?.id },
    { jobId: "TK-2026-0003", title: "เน็ตช้ามากห้องบัญชี", description: "อินเทอร์เน็ตช้าตั้งแต่เช้า ดาวน์โหลดไฟล์ไม่ได้", priority: "HIGH", status: "OPEN" },
  ]

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { jobId: t.jobId },
      update: {},
      create: t,
    })
  }

  console.log("✅ 3 Tickets created")

  // =====================
  // PHASE 4 SEED DATA
  // =====================
  
  // Borrow Records
  const assetCom1 = await prisma.asset.findUnique({ where: { assetCode: "COM-2026-0001" } })
  const assetCom2 = await prisma.asset.findUnique({ where: { assetCode: "COM-2026-0002" } })
  const assetMon1 = await prisma.asset.findUnique({ where: { assetCode: "MON-2026-0001" } })

  await prisma.borrowRecord.deleteMany({})
  
  if (assetCom2) {
    await prisma.borrowRecord.create({
      data: {
        assetId: assetCom2.id,
        borrowerName: "คุณวิชัย สมบัติดี",
        borrowerDept: "แผนกบัญชี",
        borrowDate: new Date("2026-03-20"),
        expectedReturnDate: new Date("2026-03-27"),
        status: "BORROWED",
        notes: "ยืมใช้งานชั่วคราวขณะเครื่องส่งซ่อม"
      }
    })
  }
  
  if (assetMon1) {
    await prisma.borrowRecord.create({
      data: {
        assetId: assetMon1.id,
        borrowerName: "คุณสมศรี ใจดี",
        borrowerDept: "แผนกการตลาด",
        borrowDate: new Date("2026-03-15"),
        expectedReturnDate: new Date("2026-03-22"),
        actualReturnDate: new Date("2026-03-21"),
        status: "RETURNED",
        notes: "คืนจอภาพเรียบร้อย"
      }
    })
  }
  
  if (assetCom1) {
    await prisma.borrowRecord.create({
      data: {
        assetId: assetCom1.id,
        borrowerName: "คุณประยุทธ์ ทำงานหนัก",
        borrowerDept: "แผนกบุคคล",
        borrowDate: new Date("2026-03-10"),
        expectedReturnDate: new Date("2026-03-17"),
        status: "BORROWED",
        notes: "ยืมไปใช้งานที่สาขา ยังไม่ส่งคืน (เลยกำหนด)"
      }
    })
  }

  console.log("✅ 3 Borrow Records created")

  // Maintenance (PM) Records
  const assetNet1 = await prisma.asset.findUnique({ where: { assetCode: "NET-2026-0001" } })
  const assetPrt1 = await prisma.asset.findUnique({ where: { assetCode: "PRT-2026-0001" } })

  await prisma.maintenance.deleteMany({})
  
  if (assetCom1) {
    await prisma.maintenance.create({
      data: {
        assetId: assetCom1.id,
        title: "ล้างเครื่อง + เปลี่ยนซิลิโคน CPU",
        description: "ล้างฝุ่น เปลี่ยนซิลิโคนความร้อน ตรวจสอบพัดลม",
        scheduledDate: new Date("2026-04-15"),
        status: "SCHEDULED",
        technicianId: techUser.id,
      }
    })
  }
  
  if (assetNet1) {
    await prisma.maintenance.create({
      data: {
        assetId: assetNet1.id,
        title: "อัปเดต Firmware Switch",
        description: "อัปเดต Firmware เป็นเวอร์ชันล่าสุดเพื่อปิดช่องโหว่",
        scheduledDate: new Date("2026-03-20"),
        completedDate: new Date("2026-03-21"),
        status: "COMPLETED",
        cost: 0,
      }
    })
  }
  
  if (assetPrt1) {
    await prisma.maintenance.create({
      data: {
        assetId: assetPrt1.id,
        title: "ทำความสะอาดเครื่องพิมพ์ + ตรวจสภาพลูกยาง",
        description: "ทำความสะอาดหัวเข็ม ทดสอบคุณภาพงานพิมพ์",
        scheduledDate: new Date("2026-03-15"),
        status: "SCHEDULED",
      }
    })
  }

  console.log("✅ 3 Maintenance Records created")

  // Knowledge Base Articles
  await prisma.knowledgeArticle.deleteMany({})
  
  await prisma.knowledgeArticle.create({
    data: {
      title: "วิธีเชื่อมต่อ VPN สำหรับทำงานนอกสถานที่",
      content: `## ขั้นตอนการตั้งค่า VPN

1. ดาวน์โหลดโปรแกรม FortiClient จากลิงก์ที่แผนก IT ส่งให้
2. ติดตั้งโปรแกรม เลือก VPN Only
3. เปิด FortiClient → Remote Access → VPN ตั้งค่าดังนี้:
   - Server: vpn.company.com:10443 
   - Username: ใช้ Email บริษัท
   - Password: รหัสผ่านเดียวกับ Email
4. กด Connect แล้วรอจนขึ้นสถานะ Connected
5. ทดสอบเข้าระบบภายในบริษัทได้ตามปกติ

## หากเชื่อมต่อไม่ได้
- ตรวจสอบว่าอินเทอร์เน็ตใช้งานได้ปกติ
- ลองรีสตาร์ทโปรแกรม FortiClient
- ติดต่อแผนก IT: 1234`,
      tags: "VPN,การทำงานนอกสถานที่,FortiClient",
      views: 42,
    }
  })

  await prisma.knowledgeArticle.create({
    data: {
      title: "แก้ปัญหาเครื่องพิมพ์ไม่ทำงาน - เช็คเบื้องต้น",
      content: `## อาการที่พบบ่อย

### 1. สั่งพิมพ์แล้วไม่ออก
- เช็คว่าเครื่องพิมพ์เปิดอยู่ มีไฟสีเขียวติด
- เช็คสาย USB หรือ LAN ต่ออยู่
- เข้า Control Panel → Devices and Printers → เช็ค Default Printer
- ลองสั่ง Print Test Page

### 2. กระดาษติด (Paper Jam)
- ปิดเครื่อง → เปิดฝา → ค่อยๆ ดึงกระดาษออกให้ตรง
- อย่าดึงแรง จะทำให้กระดาษฉีกติดด้านใน
- ตรวจลูกยางดึงกระดาษว่ายังมีแรงยึดอยู่ไหม

### 3. งานพิมพ์ซ้อน/จาง
- เช็คระดับหมึก/โทนเนอร์
- ลองสั่ง Cleaning Head (สำหรับ Inkjet)
- เปลี่ยนตลับหมึกถ้าหมด

### 4. เชื่อมต่อ WiFi ไม่ได้
- ลองรีเซ็ต Network ที่ตัวเครื่อง
- ตรวจดู IP Address ว่าอยู่ในวงเดียวกับ PC`,
      tags: "เครื่องพิมพ์,กระดาษติด,แก้ปัญหา",
      views: 28,
    }
  })

  await prisma.knowledgeArticle.create({
    data: {
      title: "วิธีตั้งค่า Email Outlook สำหรับพนักงานใหม่",
      content: `## การตั้งค่า Microsoft Outlook

### สำหรับ Microsoft 365
1. เปิด Outlook → File → Add Account
2. ใส่ Email บริษัท: ชื่อ@company.com
3. ระบบจะตั้งค่าให้อัตโนมัติ
4. ใส่รหัสผ่าน → ทำ MFA ที่ Authenticator App
5. เสร็จสิ้น

### การตั้งค่า Signature
1. File → Options → Mail → Signatures
2. ใส่ชื่อ-นามสกุล ตำแหน่ง แผนก เบอร์โทร
3. เลือก Apply to New Messages + Replies

### การตั้งค่า Calendar
- เปิด Calendar ด้านล่างซ้าย
- เพิ่มปฏิทินกลุ่มเพื่อจองห้องประชุม`,
      tags: "Email,Outlook,พนักงานใหม่,Microsoft365",
      views: 15,
    }
  })

  console.log("✅ 3 Knowledge Base Articles created")

  // Software Licenses
  await prisma.softwareLicense.deleteMany({})
  
  await prisma.softwareLicense.create({
    data: {
      name: "Microsoft 365 Business",
      version: "E3",
      licenseKey: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
      type: "Subscription",
      totalLicenses: 50,
      usedLicenses: 42,
      vendor: "Microsoft",
      purchaseDate: new Date("2025-06-01"),
      expirationDate: new Date("2026-05-31"),
      price: 350000,
    }
  })

  await prisma.softwareLicense.create({
    data: {
      name: "Windows 11 Pro",
      version: "23H2",
      licenseKey: "YYYYY-YYYYY-YYYYY-YYYYY-YYYYY",
      type: "Perpetual",
      totalLicenses: 30,
      usedLicenses: 28,
      vendor: "Microsoft",
      purchaseDate: new Date("2025-01-15"),
      price: 150000,
    }
  })

  await prisma.softwareLicense.create({
    data: {
      name: "ESET Endpoint Security",
      version: "11.0",
      licenseKey: "ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ",
      type: "Subscription",
      totalLicenses: 50,
      usedLicenses: 45,
      vendor: "ESET",
      purchaseDate: new Date("2025-09-01"),
      expirationDate: new Date("2026-08-31"),
      price: 75000,
    }
  })

  await prisma.softwareLicense.create({
    data: {
      name: "Adobe Creative Cloud",
      version: "2026",
      type: "Subscription",
      totalLicenses: 5,
      usedLicenses: 5,
      vendor: "Adobe",
      purchaseDate: new Date("2025-12-01"),
      expirationDate: new Date("2026-11-30"),
      price: 95000,
    }
  })

  console.log("✅ 4 Software Licenses created")

  // Domains
  await prisma.domain.deleteMany({})
  
  await prisma.domain.create({
    data: {
      name: "company.com",
      registrar: "GoDaddy",
      registrationDate: new Date("2020-01-15"),
      expirationDate: new Date("2026-01-15"),
      sslType: "Let's Encrypt Wildcard",
      sslIssuer: "Let's Encrypt",
      sslExpiration: new Date("2026-06-15"),
      hostingProvider: "AWS",
      hostingPackage: "EC2 t3.medium",
      hostingCost: 3500,
      hostingExpiration: new Date("2026-12-31"),
    }
  })

  await prisma.domain.create({
    data: {
      name: "company.co.th",
      registrar: "T.H.NIC",
      registrationDate: new Date("2021-06-01"),
      expirationDate: new Date("2026-06-01"),
      sslType: "Comodo Positive SSL",
      sslIssuer: "Comodo",
      sslExpiration: new Date("2026-04-15"),
      hostingProvider: "DigitalOcean",
      hostingPackage: "Droplet Premium",
      hostingCost: 2500,
      hostingExpiration: new Date("2026-12-31"),
    }
  })

  console.log("✅ 2 Domains created")
  console.log("🎉 Seeding complete!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
