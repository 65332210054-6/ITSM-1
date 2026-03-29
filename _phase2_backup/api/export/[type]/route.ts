export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const type = (await params).type
  let csvContent = "\uFEFF" // UTF-8 BOM for Excel compatibility
  const now = new Date().toISOString().split('T')[0]
  
  try {
    if (type === "assets") {
      const assets = await prisma.asset.findMany({
        include: { category: true, branch: true, owner: true }
      })
      
      csvContent += "Asset Code,Name,Brand,Model,Serial Number,Category,Branch,Owner,Status,Purchase Date,Price\n"
      
      assets.forEach((a: any) => {
        const name = `"${(a.name || "").replace(/"/g, '""')}"`
        const brand = `"${(a.brand || "").replace(/"/g, '""')}"`
        const pDate = a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString("en-GB") : ""
        csvContent += `${a.assetCode},${name},${brand},${a.model || ""},${a.serialNumber || ""},${a.category?.name || ""},${a.branch?.name || ""},${a.owner?.name || ""},${a.status},${pDate},${a.price || ""}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="assets_${now}.csv"`,
        }
      })
      
    } else if (type === "tickets") {
      const tickets = await prisma.ticket.findMany({
        include: { asset: true, technician: true, reporter: true }
      })
      
      csvContent += "Job ID,Title,Description,Asset Code,Priority,Status,Reporter,Technician,Root Cause,Solution,Created At,Resolved At\n"
      
      tickets.forEach((t: any) => {
        const title = `"${(t.title || "").replace(/"/g, '""')}"`
        const desc = `"${(t.description || "").replace(/"/g, '""')}"`
        const rootCause = `"${(t.rootCause || "").replace(/"/g, '""')}"`
        const solution = `"${(t.solution || "").replace(/"/g, '""')}"`
        const date = t.createdAt.toLocaleDateString("en-GB")
        const resolvedDate = t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString("en-GB") : ""
        csvContent += `${t.jobId},${title},${desc},${t.asset?.assetCode || ""},${t.priority},${t.status},${t.reporter?.name || ""},${t.technician?.name || ""},${rootCause},${solution},${date},${resolvedDate}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tickets_${now}.csv"`,
        }
      })
      
    } else if (type === "borrows") {
      const borrows = await prisma.borrowRecord.findMany({
        include: { asset: true, recordedBy: true }
      })
      
      csvContent += "Asset Code,Asset Name,Borrower,Department,Borrow Date,Expected Return,Actual Return,Status,Notes,Recorded By\n"
      
      borrows.forEach((b: any) => {
        const assetName = `"${(b.asset?.name || "").replace(/"/g, '""')}"`
        const borrower = `"${(b.borrowerName || "").replace(/"/g, '""')}"`
        const notes = `"${(b.notes || "").replace(/"/g, '""')}"`
        const bDate = b.borrowDate.toLocaleDateString("en-GB")
        const eDate = b.expectedReturnDate ? new Date(b.expectedReturnDate).toLocaleDateString("en-GB") : ""
        const aDate = b.actualReturnDate ? new Date(b.actualReturnDate).toLocaleDateString("en-GB") : ""
        csvContent += `${b.asset?.assetCode || ""},${assetName},${borrower},${b.borrowerDept || ""},${bDate},${eDate},${aDate},${b.status},${notes},${b.recordedBy?.name || ""}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="borrows_${now}.csv"`,
        }
      })
      
    } else if (type === "maintenance") {
      const maintenances = await prisma.maintenance.findMany({
        include: { asset: true, technician: true }
      })
      
      csvContent += "Asset Code,Asset Name,Title,Description,Scheduled Date,Completed Date,Status,Technician,Cost\n"
      
      maintenances.forEach((m: any) => {
        const assetName = `"${(m.asset?.name || "").replace(/"/g, '""')}"`
        const title = `"${(m.title || "").replace(/"/g, '""')}"`
        const desc = `"${(m.description || "").replace(/"/g, '""')}"`
        const sDate = m.scheduledDate.toLocaleDateString("en-GB")
        const cDate = m.completedDate ? new Date(m.completedDate).toLocaleDateString("en-GB") : ""
        csvContent += `${m.asset?.assetCode || ""},${assetName},${title},${desc},${sDate},${cDate},${m.status},${m.technician?.name || ""},${m.cost || ""}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="maintenance_${now}.csv"`,
        }
      })
      
    } else if (type === "licenses") {
      const licenses = await prisma.softwareLicense.findMany()
      
      csvContent += "Name,Version,License Key,Type,Total Licenses,Used Licenses,Available,Vendor,Purchase Date,Expiration Date,Price\n"
      
      licenses.forEach((l: any) => {
        const name = `"${(l.name || "").replace(/"/g, '""')}"`
        const key = `"${(l.licenseKey || "").replace(/"/g, '""')}"`
        const pDate = l.purchaseDate ? new Date(l.purchaseDate).toLocaleDateString("en-GB") : ""
        const eDate = l.expirationDate ? new Date(l.expirationDate).toLocaleDateString("en-GB") : ""
        csvContent += `${name},${l.version || ""},${key},${l.type || ""},${l.totalLicenses},${l.usedLicenses},${l.totalLicenses - l.usedLicenses},${l.vendor || ""},${pDate},${eDate},${l.price || ""}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="licenses_${now}.csv"`,
        }
      })

    } else if (type === "domains") {
      const domains = await prisma.domain.findMany()
      
      csvContent += "Domain Name,Registrar,Registration Date,Expiration Date,SSL Type,SSL Issuer,SSL Expiration,Hosting Provider,Hosting Package,Hosting Cost/mo,Hosting Expiration\n"
      
      domains.forEach((d: any) => {
        const name = `"${(d.name || "").replace(/"/g, '""')}"`
        const regDate = d.registrationDate ? new Date(d.registrationDate).toLocaleDateString("en-GB") : ""
        const expDate = d.expirationDate ? new Date(d.expirationDate).toLocaleDateString("en-GB") : ""
        const sslExp = d.sslExpiration ? new Date(d.sslExpiration).toLocaleDateString("en-GB") : ""
        const hostExp = d.hostingExpiration ? new Date(d.hostingExpiration).toLocaleDateString("en-GB") : ""
        csvContent += `${name},${d.registrar || ""},${regDate},${expDate},${d.sslType || ""},${d.sslIssuer || ""},${sslExp},${d.hostingProvider || ""},${d.hostingPackage || ""},${d.hostingCost || ""},${hostExp}\n`
      })
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="domains_${now}.csv"`,
        }
      })
      
    } else {
      return NextResponse.json({ error: "Invalid export type. Available: assets, tickets, borrows, maintenance, licenses, domains" }, { status: 400 })
    }
    
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
