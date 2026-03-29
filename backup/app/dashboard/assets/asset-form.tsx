"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createAsset } from "./actions"
import { useState } from "react"

export function AssetForm({ categories }: { categories: any[] }) {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มทรัพย์สินใหม่
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลงทะเบียนทรัพย์สินใหม่</DialogTitle>
        </DialogHeader>
        <form action={async (formData) => {
          await createAsset(formData)
          setOpen(false)
        }} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="assetCode">รหัสทรัพย์สิน (Asset Code)</Label>
            <Input id="assetCode" name="assetCode" required placeholder="เช่น COM-2026-0001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อเรียก/รุ่น (Name)</Label>
            <Input id="name" name="name" required placeholder="เช่น Dell OptiPlex 7090" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">หมวดหมู่อุปกรณ์</Label>
            {/* simple generic select styled vaguely like input */}
            <select id="categoryId" name="categoryId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
