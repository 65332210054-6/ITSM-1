"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus } from "lucide-react"
import { createUser } from "./actions"

export function UserForm({ roles, branches, departments }: any) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await createUser(formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      alert("เพิ่มผู้ใช้สำเร็จ")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้งานใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่มบัญชีผู้ใช้งาน (New User)</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล (Name)</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล (Email สำหรับ Login)</Label>
              <Input id="email" name="email" type="email" required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน (Password)</Label>
            <Input id="password" name="password" type="password" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleId">สิทธิ์ (Role)</Label>
              <select id="roleId" name="roleId" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                <option value="">- เลือกสิทธิ์ -</option>
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchId">สาขา (Branch)</Label>
              <select id="branchId" name="branchId" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                <option value="">- เลือกสาขา -</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departmentId">แผนก (Department)</Label>
            <select id="departmentId" name="departmentId" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">- เลือกแผนก -</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-indigo-600">
              {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
