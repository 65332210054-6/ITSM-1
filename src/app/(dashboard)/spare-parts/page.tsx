import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { SparePartForm } from "./spare-part-form"

export default async function SparePartsPage() {
  const parts = await prisma.sparePart.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">อะไหล่ / Spare Parts</h1>
        <SparePartForm />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่ออะไหล่</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>ยี่ห้อ</TableHead>
                <TableHead className="text-right">ราคา/หน่วย</TableHead>
                <TableHead className="text-center">คงเหลือ</TableHead>
                <TableHead className="text-center">Min Stock</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-slate-500">{p.category || "-"}</TableCell>
                  <TableCell className="text-slate-500">{p.brand || "-"}</TableCell>
                  <TableCell className="text-right">{p.pricePerUnit ? `฿${p.pricePerUnit.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${p.quantity <= p.minStock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {p.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-slate-500">{p.minStock}</TableCell>
                  <TableCell className="text-slate-500">{p.location || "-"}</TableCell>
                </TableRow>
              ))}
              {parts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลอะไหล่
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
