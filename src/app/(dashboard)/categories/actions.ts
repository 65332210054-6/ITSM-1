"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  
  if (!name) return { error: "Name is required" }
  
  try {
    await prisma.assetCategory.create({
      data: { name, description }
    })
    revalidatePath("/categories")
  } catch (e) {
    console.error(e)
    return { error: "Failed to create category" }
  }
}
