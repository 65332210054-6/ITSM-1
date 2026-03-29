export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TicketForm } from "./ticket-form"

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: "เปิดรอดำเนินการ", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700" },
  WAITING_PARTS: { label: "รออะไหล่", color: "bg-amber-100 text-amber-700" },
  RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "ปิดงาน", color: "bg-slate-100 text-slate-600" },
}

const priorityMap: Record<string, { label: string; color: string }> = {
  LOW: { label: "ต่ำ", color: "text-slate-500" },
  MEDIUM: { label: "ปานกลาง", color: "text-blue-600" },
  HIGH: { label: "สูง", color: "text-orange-600 font-bold" },
  CRITICAL: { label: "ฉุกเฉิน", color: "text-red-600 font-bold" },
}

export default async function TicketsPage() {
  const tickets = await prisma.ticket.findMany({
    include: {
      asset: true,
      technician: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  const assets = await prisma.asset.findMany({ orderBy: { assetCode: 'asc' } })

  // Stats
  const openCount = tickets.filter((t: any) => t.status === "OPEN").length
  const inProgressCount = tickets.filter((t: any) => t.status === "IN_PROGRESS").length
  const resolvedCount = tickets.filter((t: any) => t.status === "RESOLVED" || t.status === "CLOSED").length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">งานแจ้งซ่อม (Repair Tickets)</h1>
        <TicketForm assets={assets} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm">ทั้งหมดวันนี้</h3>
          <p className="text-2xl font-bold mt-1">{tickets.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
          <h3 className="text-red-600 text-sm">รอดำเนินการ</h3>
          <p className="text-2xl font-bold mt-1 text-red-700">{openCount}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
          <h3 className="text-blue-600 text-sm">กำลังดำเนินการ</h3>
          <p className="text-2xl font-bold mt-1 text-blue-700">{inProgressCount}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
          <h3 className="text-emerald-600 text-sm">แก้ไขแล้ว/ปิดงาน</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{resolvedCount}</p>
        </div>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>หัวข้อปัญหา</TableHead>
                <TableHead>อุปกรณ์</TableHead>
                <TableHead>ความเร่งด่วน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>SLA (กำหนดเสร็จ)</TableHead>
                <TableHead>ช่างผู้รับผิดชอบ</TableHead>
                <TableHead>วันที่แจ้ง</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket: any) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono font-bold text-blue-700">{ticket.jobId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
                  <TableCell className="text-slate-500">{ticket.asset?.assetCode || "-"}</TableCell>
                  <TableCell>
                    <span className={priorityMap[ticket.priority]?.color || ""}>
                      {priorityMap[ticket.priority]?.label || ticket.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusMap[ticket.status]?.color || "bg-slate-100"}`}>
                      {statusMap[ticket.status]?.label || ticket.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      if (!ticket.slaDueDate) return "-"
                      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
                        return ticket.isSlaBreached 
                          ? <span className="text-red-600 text-xs font-bold whitespace-nowrap">🚨 เกิน SLA</span>
                          : <span className="text-emerald-600 text-xs font-bold whitespace-nowrap">✅ ผ่าน SLA</span>
                      }
                      
                      const now = new Date()
                      const due = new Date(ticket.slaDueDate)
                      if (now > due) {
                        return <span className="text-red-600 text-xs font-bold whitespace-nowrap">🚨 เกินเวลาซ่อม</span>
                      }
                      const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
                      if (hoursLeft < 2) {
                        return <span className="text-amber-600 text-xs font-bold whitespace-nowrap">⚠️ เหลือ &lt; 2 ชม.</span>
                      }
                      return <span className="text-slate-500 text-xs whitespace-nowrap">{due.toLocaleDateString('th-TH')} {due.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    })()}
                  </TableCell>
                  <TableCell className="text-slate-500">{ticket.technician?.name || "-"}</TableCell>
                  <TableCell className="text-slate-500">
                    {ticket.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/tickets/${ticket.id}`}>
                      <Button variant="outline" size="sm">จัดการ</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    ยังไม่มีใบแจ้งซ่อม (คลิกปุ่ม 🔧 แจ้งซ่อมใหม่ ด้านบน)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
