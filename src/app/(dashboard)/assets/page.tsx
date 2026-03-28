import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AssetForm } from "./asset-form"

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    include: {
      category: true,
      branch: true,
      owner: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  // get categories for the create form
  const categories = await prisma.assetCategory.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">รายการทรัพย์สินทั้งหมด (Assets)</h1>
        <AssetForm categories={categories} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสทรัพย์สิน</TableHead>
                <TableHead>ชื่ออุปกรณ์</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่ลงทะเบียน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset: any) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium text-blue-600 truncate max-w-[120px]" title={asset.assetCode}>
                    {asset.assetCode}
                  </TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.category.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      asset.status === 'BROKEN' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {asset.status === 'ACTIVE' ? 'ปกติ' : 
                       asset.status === 'BROKEN' ? 'เสีย/ส่งซ่อม' : asset.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {asset.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/assets/${asset.id}`}>
                      <Button variant="outline" size="sm">ดูรายละเอียด</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลทรัพย์สิน (คลิก เพิ่มทรัพย์สินใหม่ ด้านบน)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
