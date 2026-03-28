import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { DomainForm } from "./domain-form"
import { AlertCircle, ShieldCheck, ShieldAlert, Server } from "lucide-react"

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="h-6 w-6 text-indigo-600" /> Domains & Hosting
          </h1>
          <p className="text-sm text-slate-500 mt-1">ระบบบริหารจัดการชื่อโดเมน, ใบรับรอง SSL และผู้ให้บริการ Hosting</p>
        </div>
        <DomainForm />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain Name</TableHead>
                <TableHead>Registrar</TableHead>
                <TableHead>หมดอายุ Domain</TableHead>
                <TableHead>สถานะ SSL</TableHead>
                <TableHead>Hosting / Provider</TableHead>
                <TableHead>หมดอายุ Hosting</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((dom: any) => {
                const isDomExpiring = dom.expirationDate && new Date(dom.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                const isSslExpiring = dom.sslExpiration && new Date(dom.sslExpiration) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                const isHostExpiring = dom.hostingExpiration && new Date(dom.hostingExpiration) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

                return (
                  <TableRow key={dom.id}>
                    <TableCell className="font-bold text-indigo-700">{dom.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{dom.registrar || "-"}</TableCell>
                    <TableCell>
                      {dom.expirationDate ? (
                        <div className={`flex items-center gap-1.5 ${isDomExpiring ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {isDomExpiring && <AlertCircle className="w-4 h-4" />}
                          {dom.expirationDate.toLocaleDateString('th-TH')}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {dom.sslExpiration ? (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit ${isSslExpiring ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-medium'}`}>
                          {isSslExpiring ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          {dom.sslExpiration.toLocaleDateString('th-TH')}
                        </div>
                      ) : <span className="text-slate-400 text-xs">No SSL info</span>}
                    </TableCell>
                    <TableCell>
                      {dom.hostingProvider ? (
                        <div>
                          <p className="font-medium text-slate-800">{dom.hostingProvider}</p>
                          <p className="text-xs text-slate-500 max-w-[150px] truncate">{dom.hostingPackage}</p>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {dom.hostingExpiration ? (
                        <div className={`flex items-center gap-1.5 ${isHostExpiring ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {isHostExpiring && <AlertCircle className="w-4 h-4" />}
                          {dom.hostingExpiration.toLocaleDateString('th-TH')}
                        </div>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {domains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    ยังไม่มีข้อมูล Domain & Hosting
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
