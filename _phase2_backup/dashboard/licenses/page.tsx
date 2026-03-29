export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { LicenseForm } from "./license-form"

export default async function LicensesPage() {
  const licenses = await prisma.softwareLicense.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Software Licenses</h1>
        <LicenseForm />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ซอฟต์แวร์</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>License Key</TableHead>
                <TableHead className="text-center">สิทธิ์(ใช้แล้ว/ทั้งหมด)</TableHead>
                <TableHead>หมดอายุ</TableHead>
                <TableHead className="text-right">ราคา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((lic: any) => {
                const isExpiring = lic.expirationDate && new Date(lic.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                const isExpired = lic.expirationDate && new Date(lic.expirationDate) < new Date()

                return (
                  <TableRow key={lic.id}>
                    <TableCell>
                      <p className="font-bold text-slate-800">{lic.name}</p>
                      {lic.version && <p className="text-xs text-slate-500">v. {lic.version}</p>}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        lic.type === 'Subscription' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {lic.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 max-w-[150px] truncate" title={lic.licenseKey}>
                      {lic.licenseKey || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{lic.usedLicenses}</span> / <span className="text-slate-500">{lic.totalLicenses}</span>
                    </TableCell>
                    <TableCell>
                      {lic.expirationDate ? (
                        <span className={`${isExpired ? 'text-red-600 font-bold' : isExpiring ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                          {lic.expirationDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {isExpired && " (หมดอายุ)"}
                        </span>
                      ) : <span className="text-emerald-600 text-xs font-medium">ไม่มีวันหมดอายุ</span>}
                    </TableCell>
                    <TableCell className="text-right">{lic.price ? `฿${lic.price.toLocaleString()}` : "-"}</TableCell>
                  </TableRow>
                )
              })}
              {licenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูล Software License
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
