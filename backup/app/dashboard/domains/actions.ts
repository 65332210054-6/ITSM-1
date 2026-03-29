"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createDomain(formData: FormData) {
  const name = formData.get("name") as string
  const registrar = formData.get("registrar") as string
  const sslType = formData.get("sslType") as string
  const sslIssuer = formData.get("sslIssuer") as string
  const hostingProvider = formData.get("hostingProvider") as string
  const hostingPackage = formData.get("hostingPackage") as string
  const hostingCost = parseFloat(formData.get("hostingCost") as string) || 0

  const regDateStr = formData.get("registrationDate") as string
  const expDateStr = formData.get("expirationDate") as string
  const sslExpStr = formData.get("sslExpiration") as string
  const hostExpStr = formData.get("hostingExpiration") as string

  if (!name) return { error: "กรุณากรอกชื่อโดเมน" }

  try {
    await prisma.domain.create({
      data: { 
        name, 
        registrar, 
        sslType, 
        sslIssuer, 
        hostingProvider, 
        hostingPackage, 
        hostingCost,
        registrationDate: regDateStr ? new Date(regDateStr) : null,
        expirationDate: expDateStr ? new Date(expDateStr) : null,
        sslExpiration: sslExpStr ? new Date(sslExpStr) : null,
        hostingExpiration: hostExpStr ? new Date(hostExpStr) : null,
      }
    })
    revalidatePath("/domains")
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถเพิ่มข้อมูลได้ หรือโดเมนนี้ซ้ำ" }
  }
}
