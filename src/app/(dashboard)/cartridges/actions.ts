"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createCartridge(formData: FormData) {
  const model = formData.get("model") as string
  const color = formData.get("color") as string
  const type = formData.get("type") as string
  const price = parseFloat(formData.get("price") as string) || 0
  const quantity = parseInt(formData.get("quantity") as string) || 0
  const minStock = parseInt(formData.get("minStock") as string) || 0
  const printerModels = formData.get("printerModels") as string

  if (!model) return { error: "กรุณากรอกรุ่นตลับหมึก" }

  try {
    await prisma.cartridge.create({
      data: { model, color, type, price, quantity, minStock, printerModels }
    })
    revalidatePath("/cartridges")
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถเพิ่มตลับหมึกได้" }
  }
}
