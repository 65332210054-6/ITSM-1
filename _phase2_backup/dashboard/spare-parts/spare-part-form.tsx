"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createSparePart } from "./actions"
import { useState } from "react"

export function SparePartForm() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มอะไหล่ใหม่
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มอะไหล่ (Spare Part)</DialogTitle>
        </DialogHeader>
        <form action={async (fd) => { await createSparePart(fd); setOpen(false); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">รหัสอะไหล่ *</Label>
              <Input id="code" name="code" required placeholder="SP-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">ชื่ออะไหล่ *</Label>
              <Input id="name" name="name" required placeholder="พัดลม CPU" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">หมวดหมู่</Label>
              <Input id="category" name="category" placeholder="อุปกรณ์คอม" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">ยี่ห้อ</Label>
              <Input id="brand" name="brand" placeholder="Noctua" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerUnit">ราคา/หน่วย (฿)</Label>
              <Input id="pricePerUnit" name="pricePerUnit" type="number" placeholder="250" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">จำนวนคงเหลือ</Label>
              <Input id="quantity" name="quantity" type="number" placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input id="minStock" name="minStock" type="number" placeholder="3" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">ตำแหน่งจัดเก็บ</Label>
            <Input id="location" name="location" placeholder="ชั้น A-3 ห้อง Server" />
          </div>
          <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
