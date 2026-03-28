"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createLicense(formData: FormData) {
  const name = formData.get("name") as string
  const version = formData.get("version") as string
  const licenseKey = formData.get("licenseKey") as string
  const type = formData.get("type") as string
  const vendor = formData.get("vendor") as string
  const totalLicenses = parseInt(formData.get("totalLicenses") as string) || 1
  const price = parseFloat(formData.get("price") as string) || 0
  
  const purchaseDateStr = formData.get("purchaseDate") as string
  const expirationDateStr = formData.get("expirationDate") as string
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null
  const expirationDate = expirationDateStr ? new Date(expirationDateStr) : null

  if (!name) return { error: "กรุณากรอกชื่อโปรแกรม" }

  try {
    await prisma.softwareLicense.create({
      data: { name, version, licenseKey, type, vendor, totalLicenses, price, purchaseDate, expirationDate }
    })
    revalidatePath("/licenses")
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถเพิ่มข้อมูลได้" }
  }
}
