import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { CartridgeForm } from "./cartridge-form"

export default async function CartridgesPage() {
  const cartridges = await prisma.cartridge.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">ตลับหมึก / Toner</h1>
        <CartridgeForm />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รุ่นตลับหมึก</TableHead>
                <TableHead>สี</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-right">ราคา</TableHead>
                <TableHead className="text-center">คงเหลือ</TableHead>
                <TableHead className="text-center">Min Stock</TableHead>
                <TableHead>เครื่องพิมพ์ที่ใช้</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartridges.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.model}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-sm ${
                      c.color === 'Black' ? 'text-slate-800' :
                      c.color === 'Cyan' ? 'text-cyan-600' :
                      c.color === 'Magenta' ? 'text-pink-600' :
                      c.color === 'Yellow' ? 'text-yellow-600' : ''
                    }`}>
                      <span className={`w-3 h-3 rounded-full ${
                        c.color === 'Black' ? 'bg-slate-800' :
                        c.color === 'Cyan' ? 'bg-cyan-500' :
                        c.color === 'Magenta' ? 'bg-pink-500' :
                        c.color === 'Yellow' ? 'bg-yellow-400' : 'bg-slate-300'
                      }`} />
                      {c.color || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.type === 'Original' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.type || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{c.price ? `฿${c.price.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${c.quantity <= c.minStock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {c.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-slate-500">{c.minStock}</TableCell>
                  <TableCell className="text-slate-500 text-xs max-w-[200px] truncate">{c.printerModels || "-"}</TableCell>
                </TableRow>
              ))}
              {cartridges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลตลับหมึก
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
