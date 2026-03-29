"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createCartridge } from "./actions"
import { useState } from "react"

export function CartridgeForm() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มตลับหมึกใหม่
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มตลับหมึก / Toner</DialogTitle>
        </DialogHeader>
        <form action={async (fd) => { await createCartridge(fd); setOpen(false); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">รุ่นตลับหมึก *</Label>
              <Input id="model" name="model" required placeholder="HP 79A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">สี</Label>
              <select id="color" name="color" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Black">Black (ดำ)</option>
                <option value="Cyan">Cyan (ฟ้า)</option>
                <option value="Magenta">Magenta (ชมพู)</option>
                <option value="Yellow">Yellow (เหลือง)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">ประเภท</Label>
              <select id="type" name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Original">Original (ของแท้)</option>
                <option value="Compatible">Compatible (เทียบ)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">ราคา (฿)</Label>
              <Input id="price" name="price" type="number" placeholder="1500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">จำนวนคงเหลือ</Label>
              <Input id="quantity" name="quantity" type="number" placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input id="minStock" name="minStock" type="number" placeholder="2" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="printerModels">เครื่องพิมพ์ที่ใช้ (คั่นด้วย ,)</Label>
            <Input id="printerModels" name="printerModels" placeholder="HP LaserJet Pro M12a, HP M26nw" />
          </div>
          <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
