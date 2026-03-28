"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createCategory } from "./actions"
import { useState } from "react"

export function CategoryForm() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มหมวดหมู่
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มหมวดหมู่อุปกรณ์ใหม่</DialogTitle>
        </DialogHeader>
        <form action={async (formData) => {
          await createCategory(formData)
          setOpen(false)
        }} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อหมวดหมู่ (Category Name)</Label>
            <Input id="name" name="name" required placeholder="เช่น คอมพิวเตอร์แล็ปท็อป" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียดเพิ่มเติม (ไม่บังคับ)</Label>
            <Input id="description" name="description" placeholder="รายละเอียด..." />
          </div>
          <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
