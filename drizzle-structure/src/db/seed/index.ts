import { db } from "../index"
import { users, roles, branches, departments } from "../schema"
import bcrypt from "bcryptjs"

async function main() {
  console.log("🌱 Seeding Drizzle Database...")

  // Create Roles
  const [roleAdmin] = await db.insert(roles).values({
    name: "Admin",
    description: "System Administrator",
  }).onConflictDoNothing().returning()

  const [roleTech] = await db.insert(roles).values({
    name: "Technician",
    description: "IT Technician",
  }).onConflictDoNothing().returning()

  const [roleUser] = await db.insert(roles).values({
    name: "User",
    description: "General Staff",
  }).onConflictDoNothing().returning()

  console.log("✅ Roles created")

  // Create Branches
  const [branchHQ] = await db.insert(branches).values({
    code: "HQ",
    name: "สำนักงานใหญ่",
    address: "กรุงเทพมหานคร",
    isMain: true,
  }).onConflictDoNothing().returning()

  console.log("✅ Branch created")

  // Create Departments
  const [deptIT] = await db.insert(departments).values({
    code: "IT",
    name: "แผนก IT",
    description: "Information Technology",
  }).onConflictDoNothing().returning()

  console.log("✅ Department created")

  // Create Admin User
  const hashedPassword = await bcrypt.hash("1234", 10)
  
  await db.insert(users).values({
    name: "Administrator",
    email: "admin@company.com",
    password: hashedPassword,
    roleId: roleAdmin?.id,
    branchId: branchHQ?.id,
    departmentId: deptIT?.id,
  }).onConflictDoNothing()
  
  console.log("✅ Admin User created (admin@company.com / 1234)")
  console.log("🎉 Seeding complete!")
}

main().catch((err) => {
  console.error("❌ Seeding failed")
  console.error(err)
  process.exit(1)
})
