"use server"

import { db } from "@/db"
import { branches, departments, roles as rolesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createBranch(formData: FormData) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  const code = formData.get("code") as string
  const name = formData.get("name") as string
  const isMain = formData.get("isMain") === "true"

  if (!code || !name) return { error: "กรุณาระบุรหัสสาขาและชื่อสาขา" }

  try {
    await db.insert(branches).values({ code, name, isMain })
    revalidatePath("/settings")
    return { success: true }
  } catch (e: any) {
    if (e.code === '23505') return { error: "รหัสสาขานี้มีอยู่แล้ว" }
    return { error: "ไม่สามารถเพิ่มสาขาได้" }
  }
}

export async function createDepartment(formData: FormData) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  const code = formData.get("code") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string || ""

  if (!code || !name) return { error: "กรุณาระบุรหัสแผนกและชื่อแผนก" }

  try {
    await db.insert(departments).values({ code, name, description })
    revalidatePath("/settings")
    return { success: true }
  } catch (e: any) {
    if (e.code === '23505') return { error: "รหัสแผนกนี้มีอยู่แล้ว" }
    return { error: "ไม่สามารถเพิ่มแผนกได้" }
  }
}

// Ensure base roles exist
export async function setupRoles() {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  const roles = [
    { name: "Admin", description: "ผู้ดูแลระบบ ควบคุมได้ทุกหน้าต่าง" },
    { name: "Technician", description: "ช่างเทคนิค จัดการงานซ่อม" },
    { name: "User", description: "ผู้ใช้งานทั่วไป แจ้งซ่อมและยืมของ" }
  ]
  
  for (const r of roles) {
    await db.insert(rolesTable).values(r).onConflictDoNothing()
  }
  return { success: true }
}
