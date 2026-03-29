import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding System Admin database...")

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

  console.log("✅ Roles created")

  // Create Admin User
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
  
  console.log(`✅ Admin User created (admin@company.com / 1234)`)
  console.log("🎉 Seeding complete!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
