"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createSparePart(formData: FormData) {
  const code = formData.get("code") as string
  const name = formData.get("name") as string
  const category = formData.get("category") as string
  const brand = formData.get("brand") as string
  const pricePerUnit = parseFloat(formData.get("pricePerUnit") as string) || 0
  const quantity = parseInt(formData.get("quantity") as string) || 0
  const minStock = parseInt(formData.get("minStock") as string) || 0
  const location = formData.get("location") as string

  if (!code || !name) return { error: "กรุณากรอกรหัสและชื่ออะไหล่" }

  try {
    await prisma.sparePart.create({
      data: { code, name, category, brand, pricePerUnit, quantity, minStock, location }
    })
    revalidatePath("/spare-parts")
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถเพิ่มอะไหล่ได้" }
  }
}
