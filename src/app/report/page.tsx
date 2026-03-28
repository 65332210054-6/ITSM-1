"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export default function ReportPage() {
  const [submitted, setSubmitted] = useState(false)
  const [jobId, setJobId] = useState("")

  async function handleSubmit(formData: FormData) {
    const res = await fetch("/api/tickets/create", {
      method: "POST",
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        priority: formData.get("priority"),
        assetId: formData.get("assetId") || null,
      }),
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    if (data.jobId) {
      setJobId(data.jobId)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="text-6xl">✅</div>
            <h1 className="text-xl font-bold text-emerald-700">แจ้งซ่อมสำเร็จ!</h1>
            <p className="text-slate-600">Job ID ของคุณคือ:</p>
            <p className="text-4xl font-black text-blue-700 tracking-widest">{jobId}</p>
            <p className="text-sm text-slate-500">กรุณาจดรหัสนี้ไว้เพื่อติดตามสถานะ<br/>ช่าง IT จะได้รับแจ้งเตือนทันที</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-red-600 text-white rounded-t-lg">
          <CardTitle className="text-center text-lg">🔧 แจ้งซ่อมอุปกรณ์ IT</CardTitle>
          <p className="text-center text-red-100 text-sm">Enterprise IT Repair Request</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">หัวข้อปัญหา / อาการ *</Label>
              <Input id="title" name="title" required placeholder="เช่น คอมเปิดไม่ติด" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
              <textarea id="description" name="description" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="อธิบายอาการที่เกิดขึ้น..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">ความเร่งด่วน</Label>
              <select id="priority" name="priority" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="LOW">ต่ำ (Low)</option>
                <option value="MEDIUM">ปานกลาง (Medium)</option>
                <option value="HIGH">สูง (High)</option>
                <option value="CRITICAL">ฉุกเฉิน (Critical)</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-base py-5">
              ส่งใบแจ้งซ่อม
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
