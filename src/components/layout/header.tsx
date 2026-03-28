import { auth } from "@/auth"
import { LogOut, User as UserIcon } from "lucide-react"
import { signOut } from "@/auth"

export async function Header() {
  const session = await auth()

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg font-black">IT</span>
        </div>
        Management
      </div>
      
      <div className="flex items-center space-x-4">
        {session?.user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-none">{session.user.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(session.user as any).roleName || 'User'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600 font-bold overflow-hidden shadow-sm">
                <UserIcon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            
            <form action={async () => {
              "use server"
              await signOut()
            }}>
              <button type="submit" className="text-sm text-slate-500 hover:text-red-600 flex items-center transition-colors">
                <LogOut className="w-4 h-4 mr-1" />
                ออกจากระบบ
              </button>
            </form>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Not Logged In</span>
        )}
      </div>
    </header>
  )
}
