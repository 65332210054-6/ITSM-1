"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createAsset(formData: FormData) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (!["Admin", "Technician"].includes(roleName)) return { error: "Permission denied" }

  const name = formData.get("name") as string
  const assetCode = formData.get("assetCode") as string
  const categoryId = formData.get("categoryId") as string
  const status = formData.get("status") as string || "ACTIVE"
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const serialNumber = formData.get("serialNumber") as string
  const price = formData.get("price") as string
  const branchId = formData.get("branchId") as string
  const ownerId = formData.get("ownerId") as string
  
  if (!name || !assetCode || !categoryId) return { error: "Missing required fields" }
  
  try {
    await prisma.asset.create({
      data: {
        name,
        assetCode,
        categoryId,
        status,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        price: price ? parseFloat(price) : null,
        branchId: branchId || null,
        ownerId: ownerId || null,
      }
    })
    revalidatePath("/assets")
  } catch (e) {
    console.error(e)
    return { error: "Failed to create asset" }
  }
}

export async function updateAsset(id: string, formData: FormData) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (!["Admin", "Technician"].includes(roleName)) return { error: "Permission denied" }

  const name = formData.get("name") as string
  const assetCode = formData.get("assetCode") as string
  const categoryId = formData.get("categoryId") as string
  const status = formData.get("status") as string
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const serialNumber = formData.get("serialNumber") as string
  const price = formData.get("price") as string
  const branchId = formData.get("branchId") as string
  const ownerId = formData.get("ownerId") as string
  const parentAssetId = formData.get("parentAssetId") as string
  
  if (!name || !assetCode || !categoryId) return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  
  try {
    await prisma.asset.update({
      where: { id },
      data: {
        name,
        assetCode,
        categoryId,
        status,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        price: price ? parseFloat(price) : null,
        branchId: branchId || null,
        ownerId: ownerId || null,
        parentAssetId: parentAssetId || null,
      }
    })
    revalidatePath(`/assets/${id}`)
    revalidatePath("/assets")
    return { success: true }
  } catch (e: any) {
    console.error(e)
    if (e.code === 'P2002') return { error: "รหัสทรัพย์สินซ้ำในระบบ" }
    return { error: "ไม่สามารถบันทึกข้อมูลได้" }
  }
}

export async function deleteAsset(id: string) {
  const session = await auth()
  const roleName = (session?.user as any)?.roleName
  if (roleName !== "Admin") return { error: "Permission denied. Admin only." }

  try {
    await prisma.asset.delete({ where: { id } })
    revalidatePath("/assets")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถลบทรัพย์สินได้ อาจมีข้อมูลเชื่อมโยง" }
  }
}
