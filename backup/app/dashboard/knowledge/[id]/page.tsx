export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tag, Eye, ChevronLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { incrementViews } from "../actions"

export default async function KnowledgeArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id }
  })
  
  if (!article) return notFound()
  
  // Increment view count asynchronously
  incrementViews(id)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link href="/knowledge" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        กลับไปหน้าฐานความรู้
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 mt-6 pb-6 border-b border-slate-100 text-sm text-slate-500">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
            {article.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div className="flex items-center">
            <Eye className="w-4 h-4 mr-2 text-slate-400" />
            ผู้เข้าชม: {article.views + 1}
          </div>
          
          {article.tags && (
            <div className="flex flex-wrap gap-1">
              {article.tags.split(',').map((tag: string, i: number) => (
                <span key={i} className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 prose prose-slate max-w-none">
          {/* Simple markdown parsing for the content */}
          {article.content.split('\n').map((line: string, i: number) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>
            if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-5 mb-3">{line.replace('## ', '')}</h2>
            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>
            if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '')}</li>
            if (line.trim() === '') return <br key={i} />
            return <p key={i} className="my-2 leading-relaxed">{line}</p>
          })}
        </div>
      </div>
    </div>
  )
}
