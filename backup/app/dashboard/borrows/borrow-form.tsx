"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createBorrow } from "./actions"

export function BorrowForm({ assets }: { assets: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createBorrow(formData)
    
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
        <Button className="bg-blue-600 hover:bg-blue-700">＋ บันทึกให้ยืม</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">บันทึกให้ยืมอุปกรณ์</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>อุปกรณ์ที่ให้ยืม <span className="text-red-500">*</span></Label>
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
            <Label>ชื่อผู้ยืม <span className="text-red-500">*</span></Label>
            <Input name="borrowerName" placeholder="เช่น นายสมชาย สมมติ" required />
          </div>
          <div className="space-y-2">
            <Label>แผนก/ฝ่าย</Label>
            <Input name="borrowerDept" placeholder="เช่น การตลาด" />
          </div>
          <div className="space-y-2">
            <Label>กำหนดคืนภายในวันที่</Label>
            <Input name="expectedReturnDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Input name="notes" placeholder="เช่น ยืมไปจัดบูธงานอีเวนต์" />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
