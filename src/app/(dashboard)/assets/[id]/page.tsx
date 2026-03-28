import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetSpecificForms } from "./asset-specific-forms"
import { Button } from "@/components/ui/button"
import { PrintQRCode } from "@/components/qrcode-view"
import Link from "next/link"
import { Pencil, ArrowLeft, Cpu, Network, Printer } from "lucide-react"

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "ใช้งานปกติ", color: "bg-emerald-100 text-emerald-700" },
  BROKEN: { label: "ชำรุด", color: "bg-red-100 text-red-700" },
  IN_REPAIR: { label: "ส่งซ่อม", color: "bg-amber-100 text-amber-700" },
  RETIRED: { label: "จำหน่ายแล้ว", color: "bg-slate-100 text-slate-600" },
  MISSING: { label: "สูญหาย", color: "bg-purple-100 text-purple-700" },
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      branch: true,
      owner: true,
      computerDetail: true,
      printerDetail: true,
      networkDetail: true,
      monitorDetail: true,
      parentAsset: { select: { assetCode: true, name: true, id: true } },
      childAssets: { select: { assetCode: true, name: true, id: true } },
    }
  })

  if (!asset) return notFound()

  const status = statusMap[asset.status] || { label: asset.status, color: "bg-slate-100 text-slate-600" }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/assets">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {asset.assetCode}
            </h1>
            <p className="text-sm text-slate-500">{asset.name}</p>
          </div>
        </div>
        <Link href={`/assets/${id}/edit`}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Pencil className="w-4 h-4" />
            แก้ไขข้อมูล
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">ชื่อ/รุ่น</span>
                <p className="font-medium text-slate-900 mt-0.5">{asset.name}</p>
              </div>
              {asset.brand && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">ยี่ห้อ</span>
                  <p className="font-medium text-slate-900 mt-0.5">{asset.brand}</p>
                </div>
              )}
              {asset.model && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">รุ่น</span>
                  <p className="font-medium text-slate-900 mt-0.5">{asset.model}</p>
                </div>
              )}
              {asset.serialNumber && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Serial Number</span>
                  <p className="font-mono text-sm text-slate-700 mt-0.5">{asset.serialNumber}</p>
                </div>
              )}
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">หมวดหมู่</span>
                <p className="font-medium text-slate-900 mt-0.5">{asset.category.name}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">สถานะ</span>
                <p className="mt-1">
                  <span className={`px-3 py-1 text-xs rounded-full font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                </p>
              </div>
              {asset.price && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">ราคา</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">฿{asset.price.toLocaleString()}</p>
                </div>
              )}
              {asset.branch && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">สาขา</span>
                  <p className="font-medium text-slate-900 mt-0.5">{asset.branch.name}</p>
                </div>
              )}
              {asset.owner && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">ผู้ครอบครอง</span>
                  <p className="font-medium text-slate-900 mt-0.5">{asset.owner.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-base">QR Code / Asset Tag</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <PrintQRCode value={`/assets/${asset.id}`} label={asset.assetCode} />
            </CardContent>
          </Card>

          {/* Connected Assets (Parent/Children) */}
          {(asset.parentAsset || asset.childAssets.length > 0) && (
            <Card>
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-base">อุปกรณ์ที่เชื่อมโยง</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                {asset.parentAsset && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider">เชื่อมกับ (แม่)</span>
                    <Link href={`/assets/${asset.parentAsset.id}`} className="block mt-1 text-blue-600 hover:underline text-sm font-medium">
                      {asset.parentAsset.assetCode} - {asset.parentAsset.name}
                    </Link>
                  </div>
                )}
                {asset.childAssets.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider">อุปกรณ์ลูก</span>
                    {asset.childAssets.map((child: any) => (
                      <Link key={child.id} href={`/assets/${child.id}`} className="block mt-1 text-blue-600 hover:underline text-sm font-medium">
                        {child.assetCode} - {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Specific Detail Forms */}
        <div className="col-span-2">
          <AssetSpecificForms asset={asset} />
        </div>
      </div>
    </div>
  )
}
