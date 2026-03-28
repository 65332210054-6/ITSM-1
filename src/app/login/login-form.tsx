"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authenticate } from "./actions"

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setErrorMessage(null)
    const result = await authenticate(formData)
    
    if (result && result.error) {
      setErrorMessage(result.error)
      setLoading(false)
    }
    // If successful, next-auth redirect will handle the navigation
  }

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
      <form action={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-slate-700">
            อีเมล (Email Address)
          </Label>
          <div className="mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-slate-700">
            รหัสผ่าน (Password)
          </Label>
          <div className="mt-1">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-100">
            {errorMessage}
          </div>
        )}

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? "กำลังลงชื่อเข้าใช้..." : "ลงชื่อเข้าใช้ (Sign In)"}
          </Button>
        </div>
      </form>
    </div>
  )
}
