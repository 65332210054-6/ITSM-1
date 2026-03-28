import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = (session?.user as any)?.roleName || "User"
  
  // Only Admin is allowed to access Users module
  if (role !== "Admin") {
    redirect("/dashboard")
  }
  
  return <>{children}</>
}
