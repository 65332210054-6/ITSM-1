"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BookOpen } from "lucide-react"
import { createArticle } from "./actions"

export function ArticleForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await createArticle(formData)
    setLoading(false)
    
    if (res?.error) {
      alert(res.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 font-medium">
          <BookOpen className="mr-2 h-4 w-4" />
          เขียนบทความใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>สร้างความรู้ใหม่ (Knowledge Base)</DialogTitle>
          <DialogDescription>
            เขียนวิธีการแก้ปัญหา หรือคู่มือการใช้งานเพื่อให้พนักงานสามารถแก้ไขปัญหาด้วยตนเอง
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="title">หัวข้อ (Title)</Label>
            <Input id="title" name="title" placeholder="เช่น วิธีแก้ไขปริ้นเตอร์กระดาษติด HP LaserJet" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">แท็ก (Tags) - คั่นด้วยลูกน้ำ</Label>
            <Input id="tags" name="tags" placeholder="เช่น Printer, Hardware, Paper Jam" />
          </div>
          
          <div className="space-y-2 flex-1 flex flex-col h-full min-h-[300px]">
            <Label htmlFor="content">เนื้อหา (Markdown หรือข้อความธรรมดา)</Label>
            <textarea 
              id="content" 
              name="content" 
              required
              className="flex-1 w-full min-h-[250px] rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="1. ปิดเครื่อง&#10;2. เปิดฝาด้านหน้า&#10;3. ดึงกระดาษออกอย่างระมัดระวัง"
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-blue-600">
              {loading ? "กำลังบันทึก..." : "บันทึกและเผยแพร่"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
