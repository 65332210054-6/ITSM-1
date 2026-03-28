"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createLicense } from "./actions"
import { useState } from "react"

export function LicenseForm() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มซอฟต์แวร์ใหม่
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>ลงทะเบียน Software License</DialogTitle>
        </DialogHeader>
        <form action={async (fd) => { await createLicense(fd); setOpen(false); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อโปรแกรม *</Label>
              <Input id="name" name="name" required placeholder="Microsoft Office, AutoCAD" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">เวอร์ชัน</Label>
              <Input id="version" name="version" placeholder="2021, Pro" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseKey">License Key</Label>
            <Input id="licenseKey" name="licenseKey" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">ประเภทลิขสิทธิ์</Label>
              <select id="type" name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Perpetual">ซื้อขาด (Perpetual)</option>
                <option value="Subscription">รายปี/เดือน (Subscription)</option>
                <option value="Open Source">ฟรี / Open Source</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalLicenses">จำนวนสิทธิ์ที่มี</Label>
              <Input id="totalLicenses" name="totalLicenses" type="number" defaultValue="1" min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">วันที่ซื้อ (ระบุเป็น ค.ศ.)</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expirationDate">วันหมดอายุ (ถ้ามี)</Label>
              <Input id="expirationDate" name="expirationDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">ผู้จำหน่าย / Vendor</Label>
              <Input id="vendor" name="vendor" placeholder="IT City, Microsoft" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">ราคา (฿)</Label>
              <Input id="price" name="price" type="number" placeholder="2500" />
            </div>
          </div>
          <Button type="submit" className="w-full mt-4">บันทึกข้อมูลไลเซนส์</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
