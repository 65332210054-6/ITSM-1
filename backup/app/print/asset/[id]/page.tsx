export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"

export default async function PrintAssetTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { category: true }
  })

  if (!asset) return notFound()

  // During SSR process.env.NEXTAUTH_URL is useful, fallback to absolute path if needed
  const qrValue = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/assets/${asset.id}`

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 print:bg-white print:m-0 print:p-0">
      <div className="bg-white border-2 border-slate-900 w-[85mm] h-[54mm] p-6 flex flex-col justify-between print:border-none print:shadow-none shadow-md">
        
        <div className="flex gap-4 items-start">
          <div className="flex-1 flex flex-col space-y-1 overflow-hidden">
            <span className="font-bold text-sm tracking-widest text-slate-500 uppercase leading-none">Property Tag</span>
            <span className="text-2xl font-black mt-1 leading-tight break-words">{asset.assetCode}</span>
          </div>
          <div className="shrink-0">
            {/* 64px roughly 1.7cm ideal for scanning */}
            <QRCodeSVG value={qrValue} size={72} level="Q" />
          </div>
        </div>
        
        <div className="mt-auto border-t-2 border-slate-900 pt-3 flex justify-between items-end">
          <div className="flex flex-col flex-1 truncate pr-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Asset Name</span>
            <span className="text-sm font-bold truncate">{asset.name}</span>
          </div>
          <div className="flex flex-col text-right shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{asset.category.name}</span>
            <span className="text-[10px] font-black">{asset.status}</span>
          </div>
        </div>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        window.onafterprint = function(){window.close()}; 
        setTimeout(() => { window.print(); }, 500);
      ` }} />
    </div>
  )
}
