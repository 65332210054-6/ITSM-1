export const runtime = 'edge'
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Eye, Tag, BookOpen } from "lucide-react"
import { ArticleForm } from "./article-form"
import Link from "next/link"

export default async function KnowledgeBasePage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || ""
  
  const whereClause = q ? {
    OR: [
      { title: { contains: q } },
      { content: { contains: q } },
      { tags: { contains: q } }
    ]
  } : {}
  
  const articles = await prisma.knowledgeArticle.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ฐานความรู้ (Knowledge Base)</h1>
          <p className="text-slate-500 text-sm mt-1">แหล่งรวบรวมวิธีแก้ปัญหาและคู่มือการใช้งานไอที</p>
        </div>
        <ArticleForm />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" action="/knowledge" className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              name="q" 
              defaultValue={q} 
              placeholder="ค้นหาบทความ เช่น วิธีใช้งาน VPN, เครื่องปริ้นเตอร์..." 
              className="pl-10 h-10 w-full md:max-w-md bg-slate-50 border-slate-200"
            />
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article: any) => (
            <Link key={article.id} href={`/knowledge/${article.id}`} className="group h-full">
              <Card className="h-full flex flex-col hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-2">
                  <p className="text-sm text-slate-500 line-clamp-3">
                    {article.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 border-t border-slate-100 mt-auto text-xs text-slate-500 flex justify-between items-center">
                  <div className="flex flex-wrap gap-1 pr-2">
                    {[...new Set(article.tags?.split(',').map((t: string) => t.trim()).filter(Boolean))].map((tag: any, i: number) => (
                      <span key={i} className="inline-flex items-center bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center text-slate-400 shrink-0">
                    <Eye className="w-3 h-3 mr-1" />
                    {article.views}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-600">ไม่พบบทความ</h3>
          <p className="text-slate-500 text-sm mt-1">ลองใช้คำค้นหาอื่น หรือสร้างบทความใหม่เพื่อแบ่งปันความรู้</p>
        </div>
      )}
    </div>
  )
}
