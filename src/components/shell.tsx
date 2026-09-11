import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Soundscape } from "@/components/soundscape"
import { LayoutDashboard, Sparkles, Settings, Radio, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { getConfig } from "@/lib/api"

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/onboard", label: "New agent", icon: Sparkles, end: false },
]
const FOOT = [
  { to: "/connect", label: "Connection", icon: Settings, end: false },
]

export function Shell() {
  // Re-read on every navigation so connect/disconnect reflects immediately.
  useLocation()
  const cfg = getConfig()
  const host = (() => {
    try { return cfg ? new URL(cfg.url).host : null } catch { return null }
  })()
  const port = host?.includes(":") ? `:${host.split(":").pop()}` : host ? "linked" : "—"
  return (
    <div className="flex min-h-screen bg-[#f1ede1] text-foreground antialiased">
      {/* ── dark instrument sidebar ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#171409] text-white md:flex">
        {/* brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/8 px-5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e63e0b] opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#e63e0b]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">VoiceAgent</span>
          <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/50">console</span>
        </div>

        {/* workspace switcher-ish card */}
        <div className="mx-4 mt-4 rounded-xl border border-white/8 bg-white/4 p-3 transition-colors hover:border-white/15">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
            <Radio className="size-3" /> Workspace
          </p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-white/90">{host ?? "Not connected"}</p>
          {cfg?.role === "viewer" && (
            <p className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">Viewer</p>
          )}
        </div>

        <nav className="flex-1 space-y-5 px-4 py-5">
          <div>
            <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">Workspace</p>
            <div className="space-y-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => cn(
                    "group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                    "text-white/60 hover:translate-x-0.5 hover:bg-white/6 hover:text-white",
                    isActive && "bg-white/8 text-white shadow-[inset_2px_0_0_0_#e63e0b]")}>
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("size-4 transition-colors",
                        isActive ? "text-[#e63e0b]" : "text-white/45 group-hover:text-white/80")} />
                      {label}
                      {isActive && <Zap className="ml-auto size-3 text-[#e63e0b]/80" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">Agent</p>
            <div className="space-y-1">
              {FOOT.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => cn(
                    "group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                    "text-white/60 hover:translate-x-0.5 hover:bg-white/6 hover:text-white",
                    isActive && "bg-white/8 text-white shadow-[inset_2px_0_0_0_#e63e0b]")}>
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("size-4 transition-colors",
                        isActive ? "text-[#e63e0b]" : "text-white/45 group-hover:text-white/80")} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* status footer */}
        <div className="border-t border-white/8 p-4">
          <div className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-white/60">
              <span className={`size-1.5 rounded-full ${host ? "bg-emerald-400" : "bg-white/25"}`} /> Control API
            </span>
            <span className="font-mono text-[10px] text-white/40">{port}</span>
          </div>
          <p className="mt-3 text-center font-mono text-[10px] tracking-wider text-white/25">v0.1 · control-plane</p>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-[#171409] px-4 text-white md:hidden">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="size-2 rounded-full bg-[#e63e0b]" /> VoiceAgent
        </span>
        <nav className="flex gap-1">
          {[...NAV, ...FOOT].map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("rounded-md px-2.5 py-1.5 text-sm transition-colors",
                isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* light canvas */}
      <main className="min-h-screen min-w-0 flex-1 pl-0 md:pl-[248px]">
        <div
          className="relative min-h-screen"
          style={{
            background:
              "radial-gradient(1100px 480px at 85% -8%, rgba(230,62,11,0.055), transparent 60%), radial-gradient(900px 420px at -10% 110%, rgba(23,20,9,0.04), transparent 55%), #f1ede1",
          }}>
          {/* dot grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: "radial-gradient(rgba(23,20,9,0.09) 0.6px, transparent 0.6px)", backgroundSize: "22px 22px" }} />
          {/* ambient soundscape: equalizer strip, voice rings, drifting warmth */}
          <Soundscape />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-20 md:px-8 md:pt-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
