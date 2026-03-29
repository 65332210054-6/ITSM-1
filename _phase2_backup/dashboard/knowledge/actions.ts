"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createArticle(formData: FormData) {
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const tags = formData.get("tags") as string || ""
  
  if (!title || !content) {
    return { error: "กรุณากรอกหัวข้อและเนื้อหา" }
  }
  
  try {
    const article = await prisma.knowledgeArticle.create({
      data: {
        title,
        content,
        tags,
      }
    })
    
    revalidatePath("/knowledge")
    return { success: true, articleId: article.id }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถบันทึกบทความได้" }
  }
}

export async function incrementViews(id: string) {
  try {
    await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        views: { increment: 1 }
      }
    })
    // No need to revalidate to avoid constant refetch on read
  } catch (e) {
    console.error(e)
  }
}
