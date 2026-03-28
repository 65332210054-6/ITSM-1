"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createMaintenance } from "./actions"

export function MaintenanceForm({ assets }: { assets: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createMaintenance(formData)
    
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-800 hover:bg-slate-900">＋ สร้างแผน PM</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">สร้างแผนซ่อมบำรุง (PM)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>อุปกรณ์ที่ต้องการทำ PM <span className="text-red-500">*</span></Label>
            <select 
              name="assetId" 
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">เลือกอุปกรณ์...</option>
              {assets.map((a: any) => (
                <option key={a.id} value={a.id}>{a.assetCode} - {a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>หัวข้องาน <span className="text-red-500">*</span></Label>
            <Input name="title" placeholder="เช่น เป่าฝุ่นเครื่อง, เปลี่ยนซิลิโคน CPU" required />
          </div>
          <div className="space-y-2">
            <Label>วันที่กำหนดทำ <span className="text-red-500">*</span></Label>
            <Input name="scheduledDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label>รายละเอียดเพิ่มติม</Label>
            <Input name="description" placeholder="รายละเอียดของตัวงาน" />
          </div>
          <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 mt-4" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึกแผนงาน"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
