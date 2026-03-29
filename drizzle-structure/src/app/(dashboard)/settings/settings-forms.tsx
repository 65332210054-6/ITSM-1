"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createBranch, createDepartment, setupRoles } from "./actions"
import { Building2, Users } from "lucide-react"

export function SettingsForms() {
  const [loading, setLoading] = useState(false)

  async function handleBranch(formData: FormData) {
    setLoading(true)
    const res = await createBranch(formData)
    if (res?.error) alert(res.error)
    else alert("เพิ่มสำเร็จ")
    setLoading(false)
  }

  async function handleDept(formData: FormData) {
    setLoading(true)
    const res = await createDepartment(formData)
    if (res?.error) alert(res.error)
    else alert("เพิ่มสำเร็จ")
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Building2 className="w-5 h-5 mr-2 text-blue-600" /> เพิ่มสาขาใหม่ (Branch)
          </CardTitle>
          <CardDescription>จัดการสถานที่ตั้งขององค์กร</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleBranch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch_code">รหัส (Code)</Label>
                <Input id="branch_code" name="code" placeholder="เช่น HQ, BKK" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_name">ชื่อสาขา (Name)</Label>
                <Input id="branch_name" name="name" placeholder="เช่น สำนักงานใหญ่" required />
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="isMain" name="isMain" value="true" />
              <label htmlFor="isMain" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                ตั้งเป็นสาขาหลัก (Headquarters)
              </label>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full">บันทึกสาขา</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2 text-emerald-600" /> เพิ่มแผนกใหม่ (Department)
          </CardTitle>
          <CardDescription>จัดกลุ่มผู้ใช้งานตามสายงาน</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleDept} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dept_code">รหัส (Code)</Label>
                <Input id="dept_code" name="code" placeholder="เช่น IT, HR, ACC" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept_name">ชื่อแผนก (Name)</Label>
                <Input id="dept_name" name="name" placeholder="เช่น ไอที, ส่วนบุคคล" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_desc">รายละเอียด</Label>
              <Input id="dept_desc" name="description" placeholder="-" />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">บันทึกแผนก</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="md:col-span-2 flex justify-end">
        <Button 
          variant="outline" 
          onClick={async () => {
            const res = await setupRoles();
            if(res.success) alert("สร้างพื้นฐานสิทธิ์ Admin, Technician, User เรียบร้อยแล้ว (โปรด Refresh)");
          }}
        >
          Initialize Default Roles (Admin & Tech)
        </Button>
      </div>
    </div>
  )
}
