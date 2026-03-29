"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { completeMaintenance } from "./actions"

export function CompleteButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await completeMaintenance(id, formData)
    
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200">ดำเนินการเสร็จสิ้น</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>ปิดงานซ่อมบำรุง</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>ค่าใช้จ่ายในการทำ PM (บาท)</Label>
            <Input name="cost" type="number" step="0.01" placeholder="หากไม่มีให้เว้นว่างไว้" />
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึกและปิดงาน"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
