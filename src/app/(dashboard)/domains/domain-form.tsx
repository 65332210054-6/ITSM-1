"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createDomain } from "./actions"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

export function DomainForm() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + เพิ่มโดเมน/โฮสติ้งใหม่
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">ลงทะเบียน Domain & Hosting</DialogTitle>
        </DialogHeader>
        <form action={async (fd) => { await createDomain(fd); setOpen(false); }} className="space-y-6 mt-4">
          
          {/* Domain Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">ข้อมูล Domain หลัก</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อโดเมน (Domain Name) *</Label>
                  <Input id="name" name="name" required placeholder="example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrar">ผู้ให้บริการจดโดเมน (Registrar)</Label>
                  <Input id="registrar" name="registrar" placeholder="GoDaddy, THNIC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationDate">วันที่จดทะเบียน</Label>
                  <Input id="registrationDate" name="registrationDate" type="date" />
                </div>
                <div className="space-y-2 border-slate-200 bg-red-50 p-3 rounded-lg border">
                  <Label htmlFor="expirationDate" className="text-red-700 font-bold">วันหมดอายุโดเมน *</Label>
                  <Input id="expirationDate" name="expirationDate" type="date" required className="bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SSL Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">เอกสารรับรองความปลอดภัย (SSL/TLS)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sslType">ประเภท SSL</Label>
                  <select id="sslType" name="sslType" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">-- ไม่ระบุ --</option>
                    <option value="Let's Encrypt (Free)">Let's Encrypt (Free)</option>
                    <option value="DV (Domain Validated)">DV (Domain Validated)</option>
                    <option value="OV (Organization Validated)">OV (Organization Validated)</option>
                    <option value="EV (Extended Validation)">EV (Extended Validation)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sslIssuer">ผู้ออกใบรับรอง (Issuer)</Label>
                  <Input id="sslIssuer" name="sslIssuer" placeholder="Cloudflare, Sectigo" />
                </div>
                <div className="space-y-2 border-slate-200 bg-amber-50 p-3 rounded-lg border">
                  <Label htmlFor="sslExpiration" className="text-amber-700 font-bold">วันหมดอายุ SSL</Label>
                  <Input id="sslExpiration" name="sslExpiration" type="date" className="bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hosting Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">โฮสติ้ง / เซิร์ฟเวอร์ (Hosting/VPS)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hostingProvider">ผู้ให้บริการ Hosting</Label>
                  <Input id="hostingProvider" name="hostingProvider" placeholder="DigitalOcean, AWS, Ruk-Com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostingPackage">แพ็กเกจ / VPS สเปค</Label>
                  <Input id="hostingPackage" name="hostingPackage" placeholder="Basic Shared 50GB / 4vCPU 8GB" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hostingCost">ค่าใช้จ่ายรายปี (฿)</Label>
                  <Input id="hostingCost" name="hostingCost" type="number" placeholder="5000" />
                </div>
                <div className="space-y-2 border-slate-200 bg-blue-50 p-3 rounded-lg border">
                  <Label htmlFor="hostingExpiration" className="text-blue-700 font-bold">วันหมดอายุ Hosting</Label>
                  <Input id="hostingExpiration" name="hostingExpiration" type="date" className="bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full py-5 text-lg">บันทึกข้อมูลระบบโดเมน</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
