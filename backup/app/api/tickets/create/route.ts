export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, priority, assetId } = body

    if (!title) {
      return NextResponse.json({ error: "กรุณากรอกหัวข้อปัญหา" }, { status: 400 })
    }

    // Auto-generate Job ID
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
    const jobId = `${prefix}${String(nextNum).padStart(4, '0')}`

    const ticket = await prisma.ticket.create({
      data: {
        jobId,
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        status: "OPEN",
        assetId: assetId || null,
      }
    })

    return NextResponse.json({ success: true, jobId: ticket.jobId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "ไม่สามารถสร้างใบแจ้งซ่อมได้" }, { status: 500 })
  }
}
