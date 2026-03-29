export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ClientCharts } from "./client-charts"
import { Monitor, Users, Building2, MapPin, Plus, ListFilter, ClipboardList } from "lucide-react"

export default async function Dashboard() {
  // Core Phase 1 Stats
  const assetCount = await prisma.asset.count()
  const userCount = await prisma.user.count()
  const branchCount = await prisma.branch.count()
  const deptCount = await prisma.department.count()
  
  // Asset Problem Stats
  const brokenAssets = await prisma.asset.count({ where: { status: "BROKEN" } })
  const repairAssets = await prisma.asset.count({ where: { status: "IN_REPAIR" } })
  const missingAssets = await prisma.asset.count({ where: { status: "MISSING" } })
  
  // Recent Assets
  const recentAssets = await prisma.asset.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { category: true, branch: true }
  })

  // Data for Charts
  const categories = await prisma.assetCategory.findMany({ 
    include: { _count: { select: { assets: true } } } 
  })
  const assetData = categories
    .map(c => ({ name: c.name, value: c._count.assets }))
    .filter(c => c.value > 0)

  const assetStatusGroup = await prisma.asset.groupBy({ by: ['status'], _count: { id: true } })
  const assetStatusData = assetStatusGroup.map(g => ({ name: g.status, value: g._count.id }))

  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    ACTIVE: { label: "ใช้งานปกติ", color: "text-emerald-700", bgColor: "bg-emerald-100" },
    BROKEN: { label: "ชำรุด", color: "text-red-700", bgColor: "bg-red-100" },
    IN_REPAIR: { label: "ส่งซ่อม", color: "text-amber-700", bgColor: "bg-amber-100" },
    RETIRED: { label: "จำหน่าย", color: "text-slate-600", bgColor: "bg-slate-100" },
    MISSING: { label: "สูญหาย", color: "text-purple-700", bgColor: "bg-purple-100" },
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบจัดการสินทรัพย์และผู้ใช้งานไอที (Phase 1)</p>
        </div>
        <div className="px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm text-[11px] font-medium text-slate-500">
          Sync: {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">สินทรัพย์ไอที</p>
              <p className="text-3xl font-extrabold mt-1 text-slate-900">{assetCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ผู้ใช้งานระบบ</p>
              <p className="text-3xl font-extrabold mt-1 text-slate-900">{userCount}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">สาขา / แผนก</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-extrabold text-slate-900">{branchCount}</p>
                <span className="text-slate-400 text-sm">/</span>
                <p className="text-2xl font-bold text-slate-600">{deptCount}</p>
              </div>
            </div>
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow bg-red-50/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">อุปกรณ์มีปัญหา</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-extrabold text-red-700">{brokenAssets + repairAssets}</p>
                <span className="text-slate-300 text-xs">(ชำรุด/ส่งซ่อม)</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-slate-200 bg-slate-50/30">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold text-slate-700">Quick Access:</span>
            <Link href="/assets">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm h-9 px-4 rounded-lg gap-2 text-xs">
                <Plus className="w-4 h-4" /> เพิ่มอุปกรณ์ใหม่
              </Button>
            </Link>
            <Link href="/users">
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg gap-2 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm">
                <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งาน
              </Button>
            </Link>
            <Link href="/categories">
              <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg gap-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                <ListFilter className="w-4 h-4" /> จัดการหมวดหมู่
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <div className="flex items-center gap-3">
          <div className="flex-1 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col">
            <span className="text-[10px] font-bold text-purple-600 uppercase">สินทรัพย์ที่สูญหาย</span>
            <span className="text-2xl font-black text-purple-700 leading-tight">{missingAssets}</span>
          </div>
          <div className="flex-1 p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">จำหน่ายออก (Retired)</span>
            <span className="text-2xl font-black text-slate-700 leading-tight">{await prisma.asset.count({ where: { status: "RETIRED" } })}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <ClientCharts assetData={assetData} assetStatusData={assetStatusData} />

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">รายการทรัพย์สินล่าสุด</h2>
            <p className="text-xs text-slate-500 mt-0.5">ครุภัณฑ์ที่นำเข้าระบบล่าสุด 5 รายการ</p>
          </div>
          <Link href="/assets" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
            ดูทั้งหมด <Monitor className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-100">รหัสทรัพย์สิน</th>
                  <th className="px-6 py-3 border-b border-slate-100">รายการ</th>
                  <th className="px-6 py-3 border-b border-slate-100">สาขา/สังกัด</th>
                  <th className="px-6 py-3 border-b border-slate-100">สถานะ</th>
                  <th className="px-6 py-3 border-b border-slate-100">วันที่เพิ่ม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAssets.length > 0 ? recentAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-blue-700 text-sm whitespace-nowrap">{asset.assetCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">{asset.name}</span>
                        <span className="text-[11px] text-slate-400 capitalize">{asset.category.name} | {asset.brand}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {asset.branch?.name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusMap[asset.status]?.bgColor} ${statusMap[asset.status]?.color}`}>
                        {statusMap[asset.status]?.label || asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {asset.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">ยังไม่มีข้อมูลครุภัณฑ์ในระบบ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
