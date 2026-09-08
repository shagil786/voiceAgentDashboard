import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, PhoneCall, Settings, Sparkles } from "lucide-react"
import { cn } from "cn"

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/onboard", label: "New agent", icon: Sparkles, end: false },
]
const FOOT = [
  { to: "/connect", label: "Connection", icon: Settings, end: false },
]

export function Shell() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b">
          <span className="flex size-2 rounded-full bg-primary" />
          <span className="text-[15px] font-semibold tracking-tight">VoiceAgent</span>
        </div>
        <nav className="flex-1 space-y-6 px-3 py-5">
          <div>
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Console</p>
            <div className="space-y-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-muted text-foreground")}>
                  <Icon className="size-4" /> {label}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Agent</p>
            <div className="space-y-1">
              {FOOT.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-muted text-foreground")}>
                  <Icon className="size-4" /> {label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        <div className="border-t px-6 py-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <PhoneCall className="size-3.5" /> v0.1 · control-plane
          </span>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="size-2 rounded-full bg-primary" /> VoiceAgent
        </span>
        <nav className="flex gap-1">
          {[...NAV, ...FOOT].map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("rounded-md px-2 py-1 text-sm", isActive ? "bg-muted" : "text-muted-foreground")}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 px-4 pt-20 pb-12 md:pt-0 md:px-8">
        <div className="mx-auto w-full max-w-6xl pt-6 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
