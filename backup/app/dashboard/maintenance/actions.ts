"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMaintenance(formData: FormData) {
  const assetId = formData.get("assetId") as string
  const title = formData.get("title") as string
  const scheduledDate = formData.get("scheduledDate") as string
  const description = formData.get("description") as string
  
  if (!assetId || !title || !scheduledDate) return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  
  try {
    await prisma.maintenance.create({
      data: {
        assetId,
        title,
        scheduledDate: new Date(scheduledDate),
        description: description || null,
        status: "SCHEDULED"
      }
    })
    
    revalidatePath("/maintenance")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถบันทึกแผนซ่อมบำรุงได้" }
  }
}

export async function completeMaintenance(id: string, formData: FormData) {
  const cost = formData.get("cost") ? parseFloat(formData.get("cost") as string) : null
  
  try {
    await prisma.maintenance.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedDate: new Date(),
        cost,
      }
    })
    
    revalidatePath("/maintenance")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถอัปเดตสถานะได้" }
  }
}
