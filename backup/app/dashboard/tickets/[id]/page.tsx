export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { TicketManageForm } from "./ticket-manage-form"

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: "เปิดรอดำเนินการ", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700" },
  WAITING_PARTS: { label: "รออะไหล่", color: "bg-amber-100 text-amber-700" },
  RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "ปิดงาน", color: "bg-slate-100 text-slate-600" },
}

const priorityMap: Record<string, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง ⚠️",
  CRITICAL: "ฉุกเฉิน 🔴",
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      asset: { include: { category: true } },
      reporter: true,
      technician: true,
    }
  })

  if (!ticket) return notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ใบงานซ่อม: {ticket.jobId}</h1>
          <p className="text-slate-500 text-sm mt-1">สร้างเมื่อ: {ticket.createdAt.toLocaleString('th-TH')}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusMap[ticket.status]?.color || "bg-slate-100"}`}>
          {statusMap[ticket.status]?.label || ticket.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Ticket Info */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">ข้อมูลการแจ้งซ่อม</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div>
                <span className="text-slate-500">หัวข้อปัญหา:</span>
                <p className="font-bold text-slate-900">{ticket.title}</p>
              </div>
              <div>
                <span className="text-slate-500">รายละเอียด:</span>
                <p className="text-slate-900">{ticket.description || "-"}</p>
              </div>
              <div>
                <span className="text-slate-500">ความเร่งด่วน:</span>
                <p className="font-bold">{priorityMap[ticket.priority] || ticket.priority}</p>
              </div>
              <div className="border-t pt-3">
                <span className="text-slate-500">SLA (กำหนดเสร็จ):</span>
                {(() => {
                  if (!ticket.slaDueDate) return <p className="text-slate-900">-</p>
                  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
                    return ticket.isSlaBreached 
                      ? <p className="text-red-600 font-bold">🚨 เกิน SLA</p>
                      : <p className="text-emerald-600 font-bold">✅ ดำเนินการทันเวลา (ผ่าน SLA)</p>
                  }
                  
                  const now = new Date()
                  const due = new Date(ticket.slaDueDate)
                  if (now > due) {
                    return <p className="text-red-600 font-bold">🚨 เกินเวลาซ่อม ({due.toLocaleString('th-TH')})</p>
                  }
                  const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
                  if (hoursLeft < 2) {
                    return <p className="text-amber-600 font-bold">⚠️ เหลือ &lt; 2 ชม. ({due.toLocaleString('th-TH')})</p>
                  }
                  return <p className="text-slate-700">{due.toLocaleString('th-TH')}</p>
                })()}
              </div>
              <div className="border-t pt-3">
                <span className="text-slate-500">อุปกรณ์ที่เกี่ยวข้อง:</span>
                {ticket.asset ? (
                  <div className="mt-1">
                    <Link href={`/assets/${ticket.asset.id}`} className="text-blue-600 hover:underline font-bold">
                      [{ticket.asset.assetCode}] {ticket.asset.name}
                    </Link>
                    <p className="text-xs text-slate-500">{ticket.asset.category?.name}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">ไม่ระบุ</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline placeholder */}
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">ไทม์ไลน์</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">เปิดงาน</p>
                  <p className="text-xs text-slate-500">{ticket.createdAt.toLocaleString('th-TH')}</p>
                </div>
              </div>
              {ticket.resolvedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">แก้ไขเสร็จ</p>
                    <p className="text-xs text-slate-500">{ticket.resolvedAt.toLocaleString('th-TH')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Manage */}
        <div className="col-span-2">
          <TicketManageForm ticket={ticket} />
        </div>
      </div>
    </div>
  )
}
