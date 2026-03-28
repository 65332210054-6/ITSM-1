"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateAsset } from "../../actions"
import { updateComputerDetail, updateNetworkDetail, updatePrinterDetail, updateMonitorDetail } from "../actions"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Loader2 } from "lucide-react"

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const STATUSES = [
  { value: "ACTIVE", label: "ใช้งานปกติ" },
  { value: "BROKEN", label: "ชำรุด" },
  { value: "IN_REPAIR", label: "ส่งซ่อม" },
  { value: "RETIRED", label: "จำหน่ายแล้ว" },
  { value: "MISSING", label: "สูญหาย" },
]

export function EditAssetForm({ asset, categories, branches, users, allAssets }: {
  asset: any
  categories: any[]
  branches: any[]
  users: any[]
  allAssets: any[]
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setSaving(true)
    setError("")
    const result = await updateAsset(asset.id, formData)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push(`/assets/${asset.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* General Info */}
      <Card>
        <CardHeader className="bg-slate-50 border-b py-4">
          <CardTitle className="text-base">ข้อมูลทั่วไป</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="assetCode">รหัสทรัพย์สิน *</Label>
                <Input id="assetCode" name="assetCode" defaultValue={asset.assetCode} required className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ/รุ่น *</Label>
                <Input id="name" name="name" defaultValue={asset.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">หมวดหมู่ *</Label>
                <select id="categoryId" name="categoryId" defaultValue={asset.categoryId} required className={selectClass}>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">ยี่ห้อ</Label>
                <Input id="brand" name="brand" defaultValue={asset.brand || ""} placeholder="Dell, HP, Lenovo..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">รุ่น (Model)</Label>
                <Input id="model" name="model" defaultValue={asset.model || ""} placeholder="OptiPlex 7090" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" name="serialNumber" defaultValue={asset.serialNumber || ""} placeholder="ABCD1234567" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">สถานะ</Label>
                <select id="status" name="status" defaultValue={asset.status} className={selectClass}>
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">ราคา (บาท)</Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={asset.price || ""} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchId">สาขา</Label>
                <select id="branchId" name="branchId" defaultValue={asset.branchId || ""} className={selectClass}>
                  <option value="">-- ไม่ระบุ --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>[{b.code}] {b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">ผู้ครอบครอง</Label>
                <select id="ownerId" name="ownerId" defaultValue={asset.ownerId || ""} className={selectClass}>
                  <option value="">-- ไม่ระบุ --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentAssetId">เชื่อมกับอุปกรณ์แม่</Label>
                <select id="parentAssetId" name="parentAssetId" defaultValue={asset.parentAssetId || ""} className={selectClass}>
                  <option value="">-- ไม่เชื่อมโยง --</option>
                  {allAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.assetCode} - {a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 min-w-[160px]">
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
                ) : (
                  <><Save className="w-4 h-4" /> บันทึกข้อมูลทั่วไป</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Computer Detail */}
      <Card>
        <CardHeader className="bg-blue-50 border-b py-4">
          <CardTitle className="text-base text-blue-800">🖥️ สเปคคอมพิวเตอร์ (Computer Specifications)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={updateComputerDetail.bind(null, asset.id)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
            <div className="space-y-2">
              <Label htmlFor="compType">ประเภท (PC/Laptop/Server)</Label>
              <Input id="compType" name="type" defaultValue={asset.computerDetail?.type || ""} placeholder="Laptop" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseContractNo">เลขสัญญาเช่า</Label>
              <Input id="leaseContractNo" name="leaseContractNo" defaultValue={asset.computerDetail?.leaseContractNo || ""} placeholder="LC-2026-001" />
            </div>
            <div className="lg:col-span-3 flex justify-end pt-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <Save className="w-4 h-4" /> บันทึกสเปคคอมพิวเตอร์
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Monitor Detail */}
      <Card>
        <CardHeader className="bg-purple-50 border-b py-4">
          <CardTitle className="text-base text-purple-800">🖥️ สเปคจอภาพ (Monitor Specifications)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={updateMonitorDetail.bind(null, asset.id)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="sizeInches">ขนาดหน้าจอ (นิ้ว)</Label>
              <Input id="sizeInches" name="sizeInches" type="number" step="0.1" defaultValue={asset.monitorDetail?.sizeInches || ""} placeholder="24" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution">ความละเอียด</Label>
              <Input id="resolution" name="resolution" defaultValue={asset.monitorDetail?.resolution || ""} placeholder="1920x1080" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panelType">ประเภทจอ (Panel)</Label>
              <Input id="panelType" name="panelType" defaultValue={asset.monitorDetail?.panelType || ""} placeholder="IPS, VA, TN" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ports">พอร์ตเชื่อมต่อ</Label>
              <Input id="ports" name="ports" defaultValue={asset.monitorDetail?.ports || ""} placeholder="HDMI, DP, USB-C" />
            </div>
            <div className="lg:col-span-3 flex justify-end pt-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <Save className="w-4 h-4" /> บันทึกสเปคจอภาพ
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Network Detail */}
      <Card>
        <CardHeader className="bg-cyan-50 border-b py-4">
          <CardTitle className="text-base text-cyan-800">🌐 ข้อมูลเครือข่าย (Network Settings)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={updateNetworkDetail.bind(null, asset.id)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="ipAddress">IP Address</Label>
              <Input id="ipAddress" name="ipAddress" defaultValue={asset.networkDetail?.ipAddress || ""} placeholder="192.168.1.50" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="macAddress">MAC Address</Label>
              <Input id="macAddress" name="macAddress" defaultValue={asset.networkDetail?.macAddress || ""} placeholder="00:1A:2B:3C:4D:5E" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bandwidth">Bandwidth</Label>
              <Input id="bandwidth" name="bandwidth" defaultValue={asset.networkDetail?.bandwidth || ""} placeholder="1Gbps" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netType">ประเภท (Router/Switch/AP)</Label>
              <Input id="netType" name="type" defaultValue={asset.networkDetail?.type || ""} placeholder="Switch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vlan">VLAN</Label>
              <Input id="vlan" name="vlan" defaultValue={asset.networkDetail?.vlan || ""} placeholder="VLAN 10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firmwareVersion">Firmware Version</Label>
              <Input id="firmwareVersion" name="firmwareVersion" defaultValue={asset.networkDetail?.firmwareVersion || ""} placeholder="v4.0.1" />
            </div>
            <div className="lg:col-span-3 flex justify-end pt-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <Save className="w-4 h-4" /> บันทึกข้อมูลเครือข่าย
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Printer Detail */}
      <Card>
        <CardHeader className="bg-amber-50 border-b py-4">
          <CardTitle className="text-base text-amber-800">🖨️ ข้อมูลเครื่องพิมพ์ (Printer Data)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={updatePrinterDetail.bind(null, asset.id)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="printerType">ประเภทปริ้นเตอร์</Label>
              <Input id="printerType" name="type" defaultValue={asset.printerDetail?.type || ""} placeholder="Laser, Inkjet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorType">สี/ขาวดำ</Label>
              <Input id="colorType" name="colorType" defaultValue={asset.printerDetail?.colorType || ""} placeholder="Color, Monochrome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printerIp">IP Address เครื่องพิมพ์</Label>
              <Input id="printerIp" name="ipAddress" defaultValue={asset.printerDetail?.ipAddress || ""} placeholder="192.168.1.100" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cartridgeModel">รุ่นตลับหมึกที่ใช้</Label>
              <Input id="cartridgeModel" name="cartridgeModel" defaultValue={asset.printerDetail?.cartridgeModel || ""} placeholder="HP 79A" />
            </div>
            <div className="lg:col-span-3 flex justify-end pt-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <Save className="w-4 h-4" /> บันทึกสเปคเครื่องพิมพ์
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
