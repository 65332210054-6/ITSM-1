import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function TechAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = (session?.user as any)?.roleName || "User"
  
  if (!["Admin", "Technician"].includes(role)) {
    redirect("/dashboard")
  }
  
  return <>{children}</>
}
