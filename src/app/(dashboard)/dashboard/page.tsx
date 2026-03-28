import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ClientCharts } from "./client-charts"
import { Monitor, Wrench, Package, Printer, ArrowRightLeft, CalendarCheck, FileKey, Globe, Plus, AlertTriangle, FileSpreadsheet } from "lucide-react"

export default async function Dashboard() {
  // Core Stats
  const assetCount = await prisma.asset.count()
  const openTickets = await prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
  
  // Spare Parts Low Stock
  const allParts = await prisma.sparePart.findMany({ select: { quantity: true, minStock: true } })
  const sparePartsLow = allParts.filter(p => p.quantity <= p.minStock).length
  
  // Cartridge Low Stock
  const allCartridges = await prisma.cartridge.findMany({ select: { quantity: true, minStock: true } })
  const cartridgeLow = allCartridges.filter(c => c.quantity <= c.minStock).length
  
  // Active Borrows
  const activeBorrows = await prisma.borrowRecord.count({ where: { status: "BORROWED" } })
  
  // Late PM
  const now = new Date()
  const allScheduledPM = await prisma.maintenance.findMany({ where: { status: "SCHEDULED" }, select: { scheduledDate: true } })
  const latePM = allScheduledPM.filter(m => new Date(m.scheduledDate) < now).length
  
  // Licenses expiring within 90 days
  const in90Days = new Date()
  in90Days.setDate(in90Days.getDate() + 90)
  const expiringLicenses = await prisma.softwareLicense.count({
    where: { expirationDate: { not: null, lte: in90Days } }
  })
  
  // Domains expiring within 90 days
  const expiringDomains = await prisma.domain.count({
    where: { expirationDate: { not: null, lte: in90Days } }
  })
  
  // Recent Tickets
  const recentTickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { asset: true, technician: true }
  })

  // Data for Charts
  const ticketGroup = await prisma.ticket.groupBy({ by: ['status'], _count: { id: true } })
  const ticketData = ticketGroup.map(g => ({ name: g.status, value: g._count.id }))

  const categories = await prisma.assetCategory.findMany({ include: { _count: { select: { assets: true } } } })
  const assetData = categories.map(c => ({ name: c.name, value: c._count.assets })).filter(c => c.value > 0)

  // Asset status distribution (for new chart)
  const assetStatusGroup = await prisma.asset.groupBy({ by: ['status'], _count: { id: true } })
  const assetStatusData = assetStatusGroup.map(g => ({ name: g.status, value: g._count.id }))

  const statusMap: Record<string, { label: string; color: string }> = {
    OPEN: { label: "รอดำเนินการ", color: "bg-red-100 text-red-700" },
    IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700" },
    WAITING_PARTS: { label: "รออะไหล่", color: "bg-amber-100 text-amber-700" },
    RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
    CLOSED: { label: "ปิดงาน", color: "bg-slate-100 text-slate-600" },
  }

  const priorityMap: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: "วิกฤต", color: "bg-red-600 text-white" },
    HIGH: { label: "สูง", color: "bg-orange-100 text-orange-700" },
    MEDIUM: { label: "กลาง", color: "bg-blue-100 text-blue-700" },
    LOW: { label: "ต่ำ", color: "bg-slate-100 text-slate-600" },
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">ภาพรวมระบบจัดการ IT & ทรัพย์สินองค์กร</p>
        </div>
        <div className="text-xs text-slate-400">
          อัปเดตล่าสุด: {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
        </div>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/assets">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider">อุปกรณ์ทั้งหมด</h3>
                  <p className="text-3xl font-bold mt-1 text-slate-800">{assetCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Monitor className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tickets">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-red-200 bg-red-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-600 font-medium text-xs uppercase tracking-wider">งานซ่อมค้าง</h3>
                  <p className="text-3xl font-bold mt-1 text-red-700">{openTickets}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <Wrench className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/spare-parts">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-amber-200 bg-amber-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-amber-600 font-medium text-xs uppercase tracking-wider">อะไหล่ Stock ต่ำ</h3>
                  <p className="text-3xl font-bold mt-1 text-amber-700">{sparePartsLow}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cartridges">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-amber-200 bg-amber-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-amber-600 font-medium text-xs uppercase tracking-wider">หมึก Stock ต่ำ</h3>
                  <p className="text-3xl font-bold mt-1 text-amber-700">{cartridgeLow}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Printer className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/borrows">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider">อุปกรณ์ยืมค้าง</h3>
                  <p className="text-3xl font-bold mt-1 text-blue-700">{activeBorrows}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ArrowRightLeft className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/maintenance">
          <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer group ${latePM > 0 ? "border-red-200 bg-red-50/30" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-medium text-xs uppercase tracking-wider ${latePM > 0 ? "text-red-600" : "text-slate-500"}`}>PM เลยกำหนด</h3>
                  <p className={`text-3xl font-bold mt-1 ${latePM > 0 ? "text-red-700" : "text-slate-800"}`}>{latePM}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${latePM > 0 ? "bg-red-100 group-hover:bg-red-200" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                  <CalendarCheck className={`w-6 h-6 ${latePM > 0 ? "text-red-500" : "text-slate-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/licenses">
          <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer group ${expiringLicenses > 0 ? "border-orange-200 bg-orange-50/30" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-medium text-xs uppercase tracking-wider ${expiringLicenses > 0 ? "text-orange-600" : "text-slate-500"}`}>Licenses ใกล้หมด</h3>
                  <p className={`text-3xl font-bold mt-1 ${expiringLicenses > 0 ? "text-orange-700" : "text-slate-800"}`}>{expiringLicenses}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expiringLicenses > 0 ? "bg-orange-100 group-hover:bg-orange-200" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                  <FileKey className={`w-6 h-6 ${expiringLicenses > 0 ? "text-orange-500" : "text-slate-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/domains">
          <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer group ${expiringDomains > 0 ? "border-orange-200 bg-orange-50/30" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-medium text-xs uppercase tracking-wider ${expiringDomains > 0 ? "text-orange-600" : "text-slate-500"}`}>Domain ใกล้หมด</h3>
                  <p className={`text-3xl font-bold mt-1 ${expiringDomains > 0 ? "text-orange-700" : "text-slate-800"}`}>{expiringDomains}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expiringDomains > 0 ? "bg-orange-100 group-hover:bg-orange-200" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                  <Globe className={`w-6 h-6 ${expiringDomains > 0 ? "text-orange-500" : "text-slate-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card className="border-dashed border-slate-300 bg-slate-50/50">
        <CardContent className="py-4 px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-500 mr-2">⚡ ลัด:</span>
            <Link href="/tickets">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50">
                <Plus className="w-3.5 h-3.5" /> แจ้งซ่อม
              </Button>
            </Link>
            <Link href="/borrows">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                <Plus className="w-3.5 h-3.5" /> ยืมอุปกรณ์
              </Button>
            </Link>
            <Link href="/assets">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Plus className="w-3.5 h-3.5" /> เพิ่มอุปกรณ์
              </Button>
            </Link>
            <Link href="/maintenance">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100">
                <Plus className="w-3.5 h-3.5" /> เพิ่มแผน PM
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100">
                <FileSpreadsheet className="w-3.5 h-3.5" /> ดาวน์โหลดรายงาน
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <ClientCharts ticketData={ticketData} assetData={assetData} assetStatusData={assetStatusData} />

      {/* Recent Tickets */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">งานแจ้งซ่อมล่าสุด</h2>
          <Link href="/tickets" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentTickets.length > 0 ? recentTickets.map((t: any) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-700 text-sm">{t.jobId}</span>
                    <div>
                      <span className="text-sm text-slate-700 group-hover:text-blue-700 transition-colors">{t.title}</span>
                      {t.technician && <span className="text-xs text-slate-400 ml-2">({t.technician.name})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.asset && <span className="text-xs text-slate-400 font-mono">{t.asset.assetCode}</span>}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityMap[t.priority]?.color || "bg-slate-100"}`}>
                      {priorityMap[t.priority]?.label || t.priority}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusMap[t.status]?.color || "bg-slate-100"}`}>
                      {statusMap[t.status]?.label || t.status}
                    </span>
                  </div>
                </Link>
              )) : (
                <div className="px-6 py-8 text-center text-slate-500 text-sm">ยังไม่มีงานแจ้งซ่อม</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
