"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { returnBorrow } from "./actions"

export function ReturnButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  async function handleReturn() {
    if (!confirm("ยืนยันการรับคืนอุปกรณ์นี้?")) return
    
    setLoading(true)
    const res = await returnBorrow(id)
    if (res?.error) {
      alert(res.error)
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
      onClick={handleReturn}
      disabled={loading}
    >
      {loading ? "กำลังบันทึก..." : "รับคืน"}
    </Button>
  )
}
