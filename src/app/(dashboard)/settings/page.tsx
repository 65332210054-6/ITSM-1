export const runtime = 'edge'
import { db } from "@/db"
import { branches as branchesTable, departments as departmentsTable, roles as rolesTable } from "@/db/schema"
import { asc } from "drizzle-orm"
import { SettingsForms } from "./settings-forms"

export default async function SettingsPage() {
  const branches = await db.query.branches.findMany({ orderBy: [asc(branchesTable.code)] })
  const departments = await db.query.departments.findMany({ orderBy: [asc(departmentsTable.code)] })
  const roles = await db.query.roles.findMany({ orderBy: [asc(rolesTable.name)] })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ (System Settings)</h1>
        <p className="text-slate-500 text-sm mt-1">จัดการโครงสร้างสาขา, แผนก และพื้นฐานสิทธิ์</p>
      </div>

      <SettingsForms />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">รายการสาขา ({branches.length})</div>
          <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {branches.map(b => (
              <li key={b.id} className="px-4 py-3 text-sm flex justify-between">
                <span><span className="font-mono text-slate-400 mr-2">[{b.code}]</span>{b.name}</span>
                {b.isMain && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">สาขาหลัก</span>}
              </li>
            ))}
            {branches.length === 0 && <li className="px-4 py-8 text-center text-slate-400 text-sm">ยังไม่มีข้อมูล</li>}
          </ul>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">รายการแผนก ({departments.length})</div>
          <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {departments.map(d => (
              <li key={d.id} className="px-4 py-3 text-sm">
                <span className="font-mono text-slate-400 mr-2">[{d.code}]</span>{d.name}
              </li>
            ))}
            {departments.length === 0 && <li className="px-4 py-8 text-center text-slate-400 text-sm">ยังไม่มีข้อมูล</li>}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">สิทธิ์พนักงาน (Roles)</div>
          <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {roles.map(r => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <span className="font-bold text-slate-700 block">{r.name}</span>
                <span className="text-xs text-slate-500">{r.description}</span>
              </li>
            ))}
            {roles.length === 0 && <li className="px-4 py-8 text-center text-slate-400 text-sm">กดดึงข้อมูลที่ปุ่มด้านบน</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
