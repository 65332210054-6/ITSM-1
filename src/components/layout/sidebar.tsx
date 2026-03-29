"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Monitor, Wrench, Settings, Tags, Package, Printer, FileKey, Globe, ArrowRightLeft, CalendarCheck, FileSpreadsheet, BookOpen } from "lucide-react"

const navSections = [
  {
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Technician", "User"] },
    ]
  },
  /* Phase 2: Helpdesk
  {
    title: "Helpdesk",
    items: [
      { href: "/tickets", icon: Wrench, label: "งานแจ้งซ่อม", roles: ["Admin", "Technician", "User"] },
      { href: "/maintenance", icon: CalendarCheck, label: "แผนซ่อมบำรุง (PM)", roles: ["Admin", "Technician"] },
      { href: "/knowledge", icon: BookOpen, label: "ฐานความรู้ (KB)", roles: ["Admin", "Technician", "User"] },
    ]
  },
  */
  {
    title: "Assets",
    items: [
      { href: "/assets", icon: Monitor, label: "ทรัพย์สินไอที", roles: ["Admin", "Technician"] },
      { href: "/categories", icon: Tags, label: "หมวดหมู่อุปกรณ์", roles: ["Admin", "Technician"] },
      /* Phase 2: Borrows & Inventory
      { href: "/borrows", icon: ArrowRightLeft, label: "ยืม-คืนอุปกรณ์", roles: ["Admin", "Technician", "User"] },
      { href: "/spare-parts", icon: Package, label: "อะไหล่ / Spare Parts", roles: ["Admin", "Technician"] },
      { href: "/cartridges", icon: Printer, label: "ตลับหมึก / Toner", roles: ["Admin", "Technician"] },
      */
    ]
  },
  /* Phase 2: Digital Assets
  {
    title: "Digital Assets",
    items: [
      { href: "/licenses", icon: FileKey, label: "Software Licenses", roles: ["Admin", "Technician"] },
      { href: "/domains", icon: Globe, label: "Domains & Hosting", roles: ["Admin", "Technician"] },
    ]
  },
  */
  {
    title: "System",
    items: [
      { href: "/users", icon: Users, label: "จัดการผู้ใช้งาน", roles: ["Admin"] },
      { href: "/settings", icon: Settings, label: "ตั้งค่าระบบ", roles: ["Admin"] },
      // { href: "/reports", icon: FileSpreadsheet, label: "ระบบรายงาน", roles: ["Admin", "Technician"] },
    ]
  }
]

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
            IT
          </div>
          <div>
            <span className="font-bold text-sm tracking-wider block leading-tight">ITSM</span>
            <span className="text-[10px] text-slate-400 block leading-tight">IT Service Management</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-3">
          {navSections.map((section, sectionIdx) => {
            const filteredItems = section.items.filter(item => item.roles.includes(role))
            if (filteredItems.length === 0) return null

            return (
              <div key={sectionIdx} className={sectionIdx > 0 ? "mt-4 pt-4 border-t border-slate-800" : ""}>
                {section.title && (
                  <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                )}
                {filteredItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 mt-0.5
                        ${active 
                          ? "bg-blue-600/90 text-white shadow-md shadow-blue-600/20" 
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                    >
                      <Icon className={`mr-3 h-[18px] w-[18px] ${active ? 'text-blue-100' : ''}`} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 font-medium">ITSM & EAM v1.0</p>
          <p className="text-[10px] text-slate-500 mt-0.5">© 2026 IT Department</p>
        </div>
      </div>
    </div>
  )
}
