import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { BorrowForm } from "./borrow-form"
import { ReturnButton } from "./return-button"

export default async function BorrowsPage() {
  const borrows = await prisma.borrowRecord.findMany({
    include: { asset: true },
    orderBy: { borrowDate: 'desc' }
  })
  
  // Exclude assets that are currently borrowed so we don't double-loan them in the form
  const borrowedAssetIds = borrows.filter((b: any) => b.status === "BORROWED").map((b: any) => b.assetId)
  
  const allAssets = await prisma.asset.findMany({
    where: { NOT: { id: { in: borrowedAssetIds } } },
    orderBy: { assetCode: 'asc' }
  })

  // Calculate stats
  const activeBorrows = borrows.filter((b: any) => b.status === "BORROWED")
  const returnedBorrows = borrows.filter((b: any) => b.status === "RETURNED")
  
  // Check for late items (status = BORROWED and expectedReturnDate < now)
  const now = new Date()
  const lateBorrows = activeBorrows.filter((b: any) => b.expectedReturnDate && new Date(b.expectedReturnDate) < now)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">ยืม-คืนอุปกรณ์ (Borrow/Return)</h1>
        <BorrowForm assets={allAssets} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
          <h3 className="text-blue-600 text-sm">กำลังถูกยืม</h3>
          <p className="text-2xl font-bold mt-1 text-blue-700">{activeBorrows.length}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
          <h3 className="text-emerald-600 text-sm">ส่งคืนแล้ว</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{returnedBorrows.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
          <h3 className="text-red-600 text-sm">เลยกำหนดส่งคืน</h3>
          <p className="text-2xl font-bold mt-1 text-red-700">{lateBorrows.length}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อุปกรณ์</TableHead>
                <TableHead>ผู้ยืม</TableHead>
                <TableHead>วันที่ยืม</TableHead>
                <TableHead>กำหนดคืน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrows.map((b: any) => {
                const isLate = b.status === "BORROWED" && b.expectedReturnDate && new Date(b.expectedReturnDate) < now;
                return (
                  <TableRow key={b.id} className={isLate ? "bg-red-50/50" : ""}>
                    <TableCell>
                      <div className="font-semibold">{b.asset?.assetCode}</div>
                      <div className="text-xs text-slate-500">{b.asset?.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{b.borrowerName}</div>
                      <div className="text-xs text-slate-500">{b.borrowerDept || "-"}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(b.borrowDate).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell className={isLate ? "text-red-600 font-bold" : "text-slate-600"}>
                      {b.expectedReturnDate ? new Date(b.expectedReturnDate).toLocaleDateString('th-TH') : "ไม่ระบุ"}
                    </TableCell>
                    <TableCell>
                      {b.status === "RETURNED" ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">✨ คืนแล้ว</span>
                      ) : isLate ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">⚠️ เลยกำหนด</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">กำลังยืม</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.status === "BORROWED" ? (
                        <ReturnButton id={b.id} />
                      ) : (
                        <span className="text-xs text-slate-400">
                          {b.actualReturnDate ? new Date(b.actualReturnDate).toLocaleDateString('th-TH') : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {borrows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูลการยืมอุปกรณ์
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
