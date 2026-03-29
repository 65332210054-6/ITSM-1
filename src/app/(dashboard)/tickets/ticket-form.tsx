"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createTicket } from "./actions"
import { useState } from "react"

export function TicketForm({ assets }: { assets: any[] }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger render={<Button className="bg-red-600 hover:bg-red-700 text-white" />}>
        🔧 แจ้งซ่อมใหม่
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แจ้งซ่อมอุปกรณ์ (New Repair Request)</DialogTitle>
        </DialogHeader>
        
        {result?.jobId ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">✅</div>
            <p className="font-bold text-lg text-emerald-700">แจ้งซ่อมสำเร็จ!</p>
            <p className="text-slate-600">Job ID ของคุณคือ:</p>
            <p className="text-3xl font-black text-blue-700 tracking-widest">{result.jobId}</p>
            <p className="text-sm text-slate-500">กรุณาจดรหัสนี้ไว้เพื่อติดตามสถานะ</p>
          </div>
        ) : (
          <form action={async (formData) => {
            const res = await createTicket(formData)
            if (res?.jobId) {
              setResult(res)
            }
          }} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="title">หัวข้อปัญหา / อาการ *</Label>
              <Input id="title" name="title" required placeholder="เช่น คอมเปิดไม่ติด, เน็ตเข้าไม่ได้" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">รายละเอียด (อธิบายเพิ่มเติม)</Label>
              <textarea id="description" name="description" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="รายละเอียดอาการเสียหรือสิ่งที่ต้องการ..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">ความเร่งด่วน</Label>
                <select id="priority" name="priority" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="LOW">ต่ำ (Low)</option>
                  <option value="MEDIUM" selected>ปานกลาง (Medium)</option>
                  <option value="HIGH">สูง (High)</option>
                  <option value="CRITICAL">ฉุกเฉิน (Critical)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetId">อุปกรณ์ที่แจ้ง (ถ้ามี)</Label>
                <select id="assetId" name="assetId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">-- ไม่ระบุ --</option>
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.id}>[{a.assetCode}] {a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white">ส่งใบแจ้งซ่อม</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
