export const runtime = 'edge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, Wrench, ArrowRightLeft, CalendarCheck, FileKey, Globe, FileDown } from "lucide-react"

const reportCards = [
  {
    title: "รายงานทรัพย์สินทั้งหมด",
    description: "ส่งออกข้อมูลอุปกรณ์, หมวดหมู่, สาขา, ผู้ครอบครอง, สถานะ และราคาซื้อ",
    icon: Monitor,
    endpoint: "assets",
    color: "bg-blue-600 hover:bg-blue-700",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "รายงานงานแจ้งซ่อม",
    description: "ส่งออกประวัติการแจ้งซ่อม รวมถึงผู้แจ้ง ช่าง สาเหตุ และวิธีแก้ไข",
    icon: Wrench,
    endpoint: "tickets",
    color: "bg-red-600 hover:bg-red-700",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    title: "รายงานการยืม-คืนอุปกรณ์",
    description: "ส่งออกรายการยืม วันที่คืน สถานะล่าสุด และหมายเหตุ",
    icon: ArrowRightLeft,
    endpoint: "borrows",
    color: "bg-emerald-600 hover:bg-emerald-700",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    title: "รายงานแผนซ่อมบำรุง (PM)",
    description: "ส่งออกแผนซ่อมบำรุงเชิงป้องกัน กำหนดการ สถานะ และค่าใช้จ่าย",
    icon: CalendarCheck,
    endpoint: "maintenance",
    color: "bg-violet-600 hover:bg-violet-700",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    title: "รายงาน Software Licenses",
    description: "ส่งออกข้อมูลลิขสิทธิ์ซอฟต์แวร์ จำนวนสิทธิ์ใช้งาน วันหมดอายุ",
    icon: FileKey,
    endpoint: "licenses",
    color: "bg-amber-600 hover:bg-amber-700",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "รายงาน Domains & Hosting",
    description: "ส่งออกข้อมูลโดเมน SSL Hosting และวันหมดอายุ",
    icon: Globe,
    endpoint: "domains",
    color: "bg-cyan-600 hover:bg-cyan-700",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ระบบรายงาน (Reports & Export)</h1>
        <p className="text-slate-500 text-sm mt-1">ดาวน์โหลดข้อมูลในรูปแบบ CSV สำหรับนำเข้า Microsoft Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.endpoint} className="flex flex-col hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 ${report.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${report.iconColor}`} />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
                <CardDescription className="text-xs">{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <form method="GET" action={`/api/export/${report.endpoint}`}>
                  <Button type="submit" className={`w-full ${report.color} text-white gap-2`}>
                    <FileDown className="w-4 h-4" />
                    ดาวน์โหลด CSV
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
        <p className="font-semibold text-slate-700 mb-2">💡 คำแนะนำ</p>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>ไฟล์ CSV ที่ส่งออกเข้ารหัสเป็น <strong>UTF-8 (BOM)</strong> เปิดอ่านบน <strong>Microsoft Excel</strong> ได้ทันทีโดยภาษาไทยไม่ผิดเพี้ยน</li>
          <li>สามารถนำไฟล์ CSV ไปใช้ใน Google Sheets, Power BI หรือ Data Studio ได้</li>
          <li>แนะนำให้ส่งออกรายงานเป็นประจำเพื่อใช้ประกอบการตัดสินใจ</li>
        </ul>
      </div>
    </div>
  )
}
