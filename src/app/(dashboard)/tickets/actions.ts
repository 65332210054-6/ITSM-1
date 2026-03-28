"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Auto-generate Job ID format: TK-YYYY-XXXX
async function generateJobId(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TK-${year}-`
  
  const lastTicket = await prisma.ticket.findFirst({
    where: { jobId: { startsWith: prefix } },
    orderBy: { jobId: 'desc' }
  })
  
  let nextNum = 1
  if (lastTicket) {
    const lastNum = parseInt(lastTicket.jobId.replace(prefix, ''))
    nextNum = lastNum + 1
  }
  
  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

export async function createTicket(formData: FormData) {
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const priority = formData.get("priority") as string || "MEDIUM"
  const assetId = formData.get("assetId") as string || null
  
  if (!title) return { error: "กรุณากรอกหัวข้อปัญหา" }
  
  try {
    const jobId = await generateJobId()
    
    let slaHours = 24;
    if (priority === "CRITICAL") slaHours = 4;
    else if (priority === "HIGH") slaHours = 8;
    else if (priority === "LOW") slaHours = 48;
    
    const slaDueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await prisma.ticket.create({
      data: {
        jobId,
        title,
        description,
        priority,
        status: "OPEN",
        assetId: assetId || undefined,
        slaDueDate,
      }
    })
    
    revalidatePath("/tickets")
    return { success: true, jobId: ticket.jobId }
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถสร้างใบแจ้งซ่อมได้" }
  }
}

export async function updateTicketStatus(ticketId: string, formData: FormData) {
  const status = formData.get("status") as string
  const technicianId = formData.get("technicianId") as string || null
  const rootCause = formData.get("rootCause") as string || null
  const solution = formData.get("solution") as string || null
  
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    const isResolved = status === "RESOLVED" || status === "CLOSED"
    const resolvedAt = isResolved ? new Date() : undefined
    
    let isSlaBreached = ticket?.isSlaBreached || false
    if (isResolved && ticket?.slaDueDate && resolvedAt) {
       isSlaBreached = resolvedAt > ticket.slaDueDate
    }
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        technicianId: technicianId || undefined,
        rootCause,
        solution,
        resolvedAt,
        isSlaBreached,
      }
    })
    
    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath("/tickets")
  } catch (e) {
    console.error(e)
    return { error: "ไม่สามารถอัปเดตสถานะได้" }
  }
}
