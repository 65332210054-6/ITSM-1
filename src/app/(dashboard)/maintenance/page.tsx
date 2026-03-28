import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { MaintenanceForm } from "./maintenance-form"
import { CompleteButton } from "./complete-button"

export default async function MaintenancePage() {
  const maintenances = await prisma.maintenance.findMany({
    include: { asset: true },
    orderBy: { scheduledDate: 'asc' }
  })
  
  const assets = await prisma.asset.findMany({
    orderBy: { assetCode: 'asc' }
  })

  // Stats
  const scheduledCount = maintenances.filter((m: any) => m.status === "SCHEDULED").length
  const completedCount = maintenances.filter((m: any) => m.status === "COMPLETED").length
  
  // Late/Upcoming
  const now = new Date()
  const lateCount = maintenances.filter((m: any) => m.status === "SCHEDULED" && new Date(m.scheduledDate) < now).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">บำรุงรักษาเชิงป้องกัน (PM)</h1>
        <MaintenanceForm assets={assets} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-600 text-sm">รอทำ PM</h3>
          <p className="text-2xl font-bold mt-1 text-slate-800">{scheduledCount}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
          <h3 className="text-emerald-600 text-sm">เสร็จสิ้นแล้ว</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{completedCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
          <h3 className="text-red-600 text-sm">เลยกำหนด</h3>
          <p className="text-2xl font-bold mt-1 text-red-700">{lateCount}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อุปกรณ์</TableHead>
                <TableHead>หัวข้องานซ่อมบำรุง</TableHead>
                <TableHead>กำหนดการทำ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenances.map((m: any) => {
                const isLate = m.status === "SCHEDULED" && new Date(m.scheduledDate) < now;
                return (
                  <TableRow key={m.id} className={isLate ? "bg-red-50/50" : ""}>
                    <TableCell>
                      <div className="font-semibold">{m.asset?.assetCode}</div>
                      <div className="text-xs text-slate-500 max-w-[150px] truncate">{m.asset?.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-blue-700">{m.title}</div>
                      <div className="text-xs text-slate-500 max-w-[200px] truncate">{m.description || "-"}</div>
                    </TableCell>
                    <TableCell className={isLate ? "text-red-600 font-bold" : "text-slate-600"}>
                      {new Date(m.scheduledDate).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>
                      {m.status === "COMPLETED" ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">✨ ทำแล้ว</span>
                      ) : isLate ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">⚠️ รอทำ (ล่าช้า)</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">รอทำตามกำหนด</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.status === "SCHEDULED" ? (
                        <CompleteButton id={m.id} />
                      ) : (
                        <div className="text-xs text-slate-500">
                          <div>เสร็จ: {m.completedDate ? new Date(m.completedDate).toLocaleDateString('th-TH') : ""}</div>
                          {m.cost ? <div className="text-emerald-600 mt-1">฿{m.cost.toLocaleString()}</div> : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {maintenances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    ยังไม่มีแผนซ่อมบำรุงในระบบ
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
