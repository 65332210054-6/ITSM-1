"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(formData: FormData) {
  try {
    await signIn("credentials", formData)
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
        default:
          return { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }
      }
    }
    throw error // Required for Next.js redirect mechanism
  }
}
