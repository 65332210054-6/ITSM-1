"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateTicketStatus } from "../actions"

export function TicketManageForm({ ticket }: { ticket: any }) {
  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">อัปเดตสถานะ & บันทึกการแก้ไข</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form action={async (formData) => { await updateTicketStatus(ticket.id, formData) }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">เปลี่ยนสถานะ</Label>
            <select id="status" name="status" defaultValue={ticket.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="OPEN">เปิดรอดำเนินการ</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="WAITING_PARTS">รออะไหล่</option>
              <option value="RESOLVED">แก้ไขแล้ว</option>
              <option value="CLOSED">ปิดงาน</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rootCause">สาเหตุของปัญหา (Root Cause)</Label>
            <textarea id="rootCause" name="rootCause" rows={2} defaultValue={ticket.rootCause || ""} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="เช่น พัดลม CPU เสีย, RAM ชำรุด..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solution">วิธีแก้ไข / สิ่งที่ทำ (Solution)</Label>
            <textarea id="solution" name="solution" rows={2} defaultValue={ticket.solution || ""} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="เช่น เปลี่ยนพัดลมใหม่, เพิ่ม RAM 8GB..." />
          </div>
          <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
        </form>
      </CardContent>
    </Card>
  )
}
