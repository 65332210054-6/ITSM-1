export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CategoryForm } from "./category-form"

export default async function CategoriesPage() {
  const categories = await prisma.assetCategory.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">จัดการหมวดหมู่อุปกรณ์</h1>
        <CategoryForm />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อหมวดหมู่</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-slate-500">{cat.description || "-"}</TableCell>
                  <TableCell className="text-slate-500">
                    {cat.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">แก้ไข</Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลหมวดหมู่ (คลิกปุ่ม เพิ่มหมวดหมู่ ด้านบน)
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
