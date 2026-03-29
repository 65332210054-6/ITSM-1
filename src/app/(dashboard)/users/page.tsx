export const runtime = 'edge'
export const dynamic = 'force-dynamic'
import { db } from "@/db"
import { users as usersTable, roles as rolesTable, branches as branchesTable, departments as departmentsTable } from "@/db/schema"
import { desc, asc, eq } from "drizzle-orm"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserForm } from "./user-form"
import { ShieldAlert, Building2, UserCircle } from "lucide-react"

export default async function UsersPage() {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: { name: rolesTable.name },
      branch: { name: branchesTable.name },
      department: { name: departmentsTable.name },
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .orderBy(desc(usersTable.createdAt))

  const roles = await db.select().from(rolesTable).orderBy(asc(rolesTable.name))
  const branches = await db.select().from(branchesTable).orderBy(asc(branchesTable.name))
  const departments = await db.select().from(departmentsTable).orderBy(asc(departmentsTable.name))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน (Users Management)</h1>
          <p className="text-slate-500 text-sm mt-1">ควบคุมรายชื่อพนักงาน ข้อมูลติดต่อ และระดับการเข้าถึงข้อมูล</p>
        </div>
        <UserForm roles={roles} branches={branches} departments={departments} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-between">
          <div>
            <h3 className="text-indigo-600 text-sm font-semibold">ผู้ใช้งานทั้งหมด</h3>
            <p className="text-2xl font-bold mt-1 text-slate-800">{users.length} <span className="text-sm font-normal text-slate-500">บัญชี</span></p>
          </div>
          <UserCircle className="w-10 h-10 text-indigo-200" />
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <h3 className="text-emerald-700 text-sm font-semibold">จำนวนสาขา/แผนก</h3>
            <p className="text-2xl font-bold mt-1 text-slate-800">{branches.length} <span className="text-sm font-normal text-slate-500">/ {departments.length}</span></p>
          </div>
          <Building2 className="w-10 h-10 text-emerald-200" />
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between">
          <div>
            <h3 className="text-amber-700 text-sm font-semibold">กลุ่มสิทธิ์ (Roles)</h3>
            <p className="text-2xl font-bold mt-1 text-slate-800">{roles.length}</p>
          </div>
          <ShieldAlert className="w-10 h-10 text-amber-200" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ข้อมูลเบื้องต้น</TableHead>
                <TableHead>อีเมล (Login)</TableHead>
                <TableHead>สิทธิ์ (Role)</TableHead>
                <TableHead>สาขา (Branch)</TableHead>
                <TableHead>แผนก (Dept)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                        {u.name?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span className="font-semibold text-slate-800">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${u.role.name === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {u.role.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{u.branch?.name || '-'}</TableCell>
                  <TableCell className="text-sm text-slate-600">{u.department?.name || '-'}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลผู้ใช้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-700 text-sm flex gap-3 mt-4">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <p>
          <strong>หมายเหตุ:</strong> บัญชีผู้ใช้งานที่สร้างจากหน้านี้ จะสามารถนำ Email และ Password ไปกรอกในหน้าต่าง Login (Authentication) ของระบบได้ โดบรหัสผ่านจะถูกเข้ารหัสระดับสูง (bcrypt) แบบอัตโนมัติ
        </p>
      </div>
    </div>
  )
}
