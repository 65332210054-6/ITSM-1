"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateComputerDetail, updateNetworkDetail, updatePrinterDetail } from "./actions"

export function AssetSpecificForms({ asset }: { asset: any }) {
  // Check what exists or allow user to fill specific data
  return (
    <div className="space-y-6 mt-6">
      
      {/* Computer Specifics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สเปคคอมพิวเตอร์ (Computer Specifications)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateComputerDetail.bind(null, asset.id)} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpu">CPU / Processor</Label>
              <Input id="cpu" name="cpu" defaultValue={asset.computerDetail?.cpu || ""} placeholder="Intel Core i7-13700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ram">RAM / Memory</Label>
              <Input id="ram" name="ram" defaultValue={asset.computerDetail?.ram || ""} placeholder="16GB DDR5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage">HDD / SSD Storage</Label>
              <Input id="storage" name="storage" defaultValue={asset.computerDetail?.storage || ""} placeholder="512GB M.2 NVMe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">OS / Windows Version</Label>
              <Input id="os" name="os" defaultValue={asset.computerDetail?.os || ""} placeholder="Windows 11 Pro" />
            </div>
            <div className="col-span-2 mt-2">
              <Button type="submit" variant="secondary">บันทึกสเปคคอมพิวเตอร์</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Network Specifics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลเครือข่ายพื้นฐาน (IP / Network Settings)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateNetworkDetail.bind(null, asset.id)} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ipAddress">IP Address</Label>
              <Input id="ipAddress" name="ipAddress" defaultValue={asset.networkDetail?.ipAddress || ""} placeholder="192.168.1.50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="macAddress">MAC Address</Label>
              <Input id="macAddress" name="macAddress" defaultValue={asset.networkDetail?.macAddress || ""} placeholder="00:1A:2B:3C:4D:5E" />
            </div>
            <div className="col-span-2 mt-2">
              <Button type="submit" variant="secondary">บันทึกข้อมูลเครือข่าย</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Printer Specifics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลเฉพาะเครื่องพิมพ์ (Printer Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePrinterDetail.bind(null, asset.id)} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">ประเภทปริ้นเตอร์</Label>
              <Input id="type" name="type" defaultValue={asset.printerDetail?.type || ""} placeholder="Laser, Inkjet, Dot Matrix" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cartridgeModel">รุ่นตลับหมึกที่ใช้ (รองรับการตัดสต๊อกหมึก)</Label>
              <Input id="cartridgeModel" name="cartridgeModel" defaultValue={asset.printerDetail?.cartridgeModel || ""} placeholder="HP 79A" />
            </div>
            <div className="col-span-2 mt-2">
              <Button type="submit" variant="secondary">บันทึกสเปคเครื่องพิมพ์</Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
