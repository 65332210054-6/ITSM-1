import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EditAssetForm } from "./edit-asset-form"

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      branch: true,
      owner: true,
      computerDetail: true,
      monitorDetail: true,
      printerDetail: true,
      networkDetail: true,
    }
  })

  if (!asset) return notFound()

  const categories = await prisma.assetCategory.findMany({ orderBy: { name: 'asc' } })
  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } })
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  const allAssets = await prisma.asset.findMany({
    where: { NOT: { id } },
    orderBy: { assetCode: 'asc' },
    select: { id: true, assetCode: true, name: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/assets/${id}`}>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">แก้ไขทรัพย์สิน</h1>
          <p className="text-sm text-slate-500">{asset.assetCode} - {asset.name}</p>
        </div>
      </div>

      <EditAssetForm 
        asset={asset}
        categories={categories}
        branches={branches}
        users={users}
        allAssets={allAssets}
      />
    </div>
  )
}
