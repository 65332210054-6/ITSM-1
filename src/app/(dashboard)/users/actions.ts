"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"

export async function createUser(formData: FormData) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const roleId = formData.get("roleId") as string || null
  const branchId = formData.get("branchId") as string || null
  const departmentId = formData.get("departmentId") as string || null

  if (!email || !password || !name) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: "อีเมลนี้มีในระบบแล้ว" }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId,
        branchId,
        departmentId
      }
    })

    revalidatePath("/users")
    return { success: true }
  } catch (e: any) {
    console.error(e)
    return { error: "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน" }
  }
}

export async function deleteUser(id: string) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath("/users")
    return { success: true }
  } catch (e) {
    return { error: "ไม่สามารถลบผู้ใช้งานได้ (อาจมีข้อมูลผูกพันอยู่)" }
  }
}
