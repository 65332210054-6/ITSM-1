export const runtime = 'edge'
export const dynamic = 'force-dynamic'
import { auth } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900">ยินดีต้อนรับเข้าสู่ระบบจัดการองค์กร</h1>
        <p className="text-slate-500 mt-2">สวัสดีคุณ {session?.user?.name}, คุณกำลังเข้าใช้งานในส่วนของผู้ดูแลระบบ</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="font-semibold text-blue-900 text-lg">จัดการผู้ใช้งาน</h3>
            <p className="text-blue-700 text-sm mt-1">เพิ่ม แก้ไข หรือระงับสิทธิ์การใช้งานของพนักงานในองค์กร</p>
          </div>
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-lg">
            <h3 className="font-semibold text-slate-900 text-lg">ตั้งค่าระบบ</h3>
            <p className="text-slate-500 text-sm mt-1">จัดการโครงสร้างสาขา และแผนกต่างๆ ของบริษัท</p>
          </div>
        </div>
      </div>
    </div>
  )
}
