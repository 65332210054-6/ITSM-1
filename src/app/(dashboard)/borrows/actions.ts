"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createBorrow(formData: FormData) {
  const assetId = formData.get("assetId") as string
  const borrowerName = formData.get("borrowerName") as string
  const borrowerDept = formData.get("borrowerDept") as string
  const expectedReturnDate = formData.get("expectedReturnDate") as string
  const notes = formData.get("notes") as string
  
  if (!assetId || !borrowerName) return { error: "กรุณาระบุอุปกรณ์และผู้ยืม" }
  
  try {
    const borrow = await prisma.borrowRecord.create({
      data: {
        assetId,
        borrowerName,
        borrowerDept: borrowerDept || null,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        notes: notes || null,
        status: "BORROWED"
      }
    })
    
    // Optional: Update Asset status to "BORROWED" if we want to track it globally
    // We'll keep it simple for now and rely on the borrow records to check availability

    revalidatePath("/borrows")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถบันทึกข้อมูลการยืมได้" }
  }
}

export async function returnBorrow(id: string) {
  try {
    await prisma.borrowRecord.update({
      where: { id },
      data: {
        status: "RETURNED",
        actualReturnDate: new Date(),
      }
    })
    
    revalidatePath("/borrows")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถบันทึกการส่งคืนได้" }
  }
}
