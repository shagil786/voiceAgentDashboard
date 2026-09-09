import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, ArrowUpRight, PlugZap, Star, ArrowRight, ListChecks, BarChart3 } from "lucide-react"
import { api, getConfig, type CallRow, type RatingRow, type Summary } from "@/lib/api"
import { cn } from "@/lib/utils"

type Data = { summary: Summary; calls: CallRow[]; ratings: RatingRow[] }
type Phase = "loading" | "live" | "empty" | "error"

function verdictClass(v: string) {
  const s = v.toUpperCase()
  if (s.includes("ALLOW")) return "text-emerald-600 border-emerald-200"
  if (s.includes("ESCALATE")) return "text-amber-600 border-amber-200"
  if (s.includes("DENY")) return "text-red-600 border-red-200"
  return ""
}

/** Decorative voice-waveform bars for the empty state. */
function Waveform() {
  const heights = [10, 22, 34, 26, 42, 18, 30, 48, 24, 38, 16, 28, 44, 20, 12]
  return (
    <div className="flex h-16 items-end justify-center gap-1.5" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-[#ff5701] transition-all duration-500"
          style={{ height: `${h}px`, animation: `wave 1.6s ease-in-out ${i * 0.09}s infinite`, opacity: 0.55 + (i % 3) * 0.15 }}
        />
      ))}
      <style>{`@keyframes wave { 0%,100% { transform: scaleY(0.55); } 50% { transform: scaleY(1); } }`}</style>
    </div>
  )
}

const STEPS = [
  { icon: PlugZap, title: "Connect", desc: "Point the console at your agent's control API." },
  { icon: ListChecks, title: "Onboard", desc: "Describe your business — the agent compiles its knowledge and tools." },
  { icon: BarChart3, title: "Operate", desc: "Every call, verdict and rating lands here in real time." },
]

export function DashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const [error, setError] = useState<string | null>(null)
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const callKey = (c: CallRow) => `${c.conv_id}:${c.ts}`

  // bump summary from newly observed rows (no refetch needed)
  function mergeFresh(prev: Data, latest: CallRow[]): Data {
    const seen = new Set(prev.calls.map(callKey))
    const fresh = latest.filter((c) => !seen.has(callKey(c)))
    if (!fresh.length) return prev
    const freshKeys = new Set(fresh.map(callKey))
    setFlashKeys(freshKeys)
    window.setTimeout(() => {
      setFlashKeys((cur) => {
        const next = new Set(cur)
        freshKeys.forEach((k) => next.delete(k))
        return next
      })
    }, 2600)
    const convs = new Set(prev.calls.map((c) => c.conv_id))
    const summary = { ...prev.summary }
    summary.calls += fresh.length
    for (const c of fresh) {
      if (!convs.has(c.conv_id)) { summary.conversations += 1; convs.add(c.conv_id) }
      const v = c.verdict || "OTHER"
      summary.verdicts = { ...summary.verdicts, [v]: (summary.verdicts[v] || 0) + 1 }
    }
    // newest-first: fresh is already DESC, prepend then cap
    const calls = [...fresh, ...prev.calls].slice(0, 30)
    setLastUpdate(new Date())
    return { summary, calls, ratings: prev.ratings }
  }

  async function load() {
    setPhase("loading"); setError(null)
    if (!getConfig()) { setPhase("empty"); return }
    try {
      const [summary, calls, ratings] = await Promise.all([api.summary(), api.calls(100), api.ratings(50)])
      setData({ summary, calls: calls.calls, ratings: ratings.ratings })
      setLastUpdate(new Date())
      setPhase("live")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }
  useEffect(() => { void load() }, [])

  // live decision streaming: poll every 4s while visible & live
  useEffect(() => {
    if (phase !== "live") return
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return
      try {
        const { calls: latest } = await api.calls(20)
        setData((prev) => (prev ? mergeFresh(prev, latest) : prev))
      } catch { /* transient — next tick retries */ }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [phase])

  const goToConnect = () => { window.location.href = "/connect" }

  if (phase === "loading") {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-44" />
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (phase === "empty") {
    return (
      <div className="mx-auto max-w-4xl pt-6">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff5701]">VoiceAgent Console</p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Your agent's live heartbeat,
            <span className="text-black/25"> once it's running.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-black/55">
            Connect the console and every governed decision, caller rating and
            escalation appears here — live, audited, nothing fake.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <div className="card-3d p-6">
            <Waveform />
            <div className="mt-5 text-center">
              <Button size="lg" className="h-11 gap-2 rounded-full bg-[#141416] px-7 text-white hover:bg-black hover:shadow-lg hover:shadow-black/20 hover:transition-all">
                Connect your agent <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title}
              className="card-3d card-3d-hover group p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#141416] text-[#ff5701] transition-colors group-hover:bg-[#ff5701] group-hover:text-white">
                  <Icon className="size-4" />
                </span>
                <span className="font-mono text-[11px] text-black/35">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-black/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="space-y-8">
        <Alert variant="destructive">
          <AlertTitle>Couldn't reach the agent</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button onClick={() => void load()}><RefreshCw className="size-4 mr-2" /> Retry</Button>
          <Button variant="outline" onClick={goToConnect}>Connection settings</Button>
        </div>
      </div>
    )
  }

  // live
  const { summary: s, calls, ratings } = data!
  const verdictTotal = Math.max(1, Object.values(s.verdicts).reduce((a, b) => a + b, 0))
  const verdicts = Object.entries(s.verdicts).sort((a, b) => b[1] - a[1])
  const comments = ratings.filter((r) => r.comment)

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#ff5701]">Overview</p>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-black/45">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live from the decision log · auto-updates every 4s
            {lastUpdate && (
              <span className="font-mono text-[11px] text-black/30">
                · {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-full">
          <RefreshCw className="size-3.5 mr-2" /> Refresh
        </Button>
      </header>

      {/* hero metrics */}
      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="card-3d relative overflow-hidden p-0">
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-[#ff5701]/6" />
          <CardHeader className="pb-1">
            <CardDescription className="font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">Calls handled</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-semibold tracking-[-0.03em] tabular-nums">{s.calls.toLocaleString()}</p>
            <p className="mt-2 text-sm text-black/45">
              across <span className="font-medium text-black/75">{s.conversations.toLocaleString()}</span> conversations
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-5">
          <Card className="card-3d card-3d-hover">
            <CardHeader className="pb-1">
              <CardDescription className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">
                Rating <Star className="size-3 fill-amber-400 text-amber-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {s.avg_rating_10 != null ? s.avg_rating_10.toFixed(1) : "—"}
                {s.avg_rating_10 != null && <span className="text-lg font-normal text-black/35">/10</span>}
              </p>
            </CardContent>
          </Card>
          <Card className="card-3d card-3d-hover">
            <CardHeader className="pb-1">
              <CardDescription className="font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">Escalation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {s.escalation_rate != null ? `${Math.round(s.escalation_rate * 100)}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="card-3d flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">Verdict mix</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-3.5">
            {verdicts.map(([v, n]) => {
              const pct = Math.round((n / verdictTotal) * 100)
              const color = v.includes("ALLOW") ? "bg-emerald-500" : v.includes("ESCALATE") ? "bg-amber-500" : v.includes("DENY") ? "bg-red-500" : "bg-slate-400"
              return (
                <div key={v}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(v))}>{v}</Badge>
                    <span className="text-xs tabular-nums text-black/45">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {/* decisions table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent decisions</h2>
          <Button variant="ghost" size="sm" className="text-black/45 transition-colors hover:text-black">
            All decisions <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        </div>
        <Card className="card-3d overflow-hidden">
          <CardContent className="p-0">
            {calls.length === 0 ? (
              <p className="py-10 text-center text-sm text-black/45">
                No decisions logged yet — they appear as your agent handles calls.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/[0.02] hover:bg-black/[0.02]">
                    <TableHead className="pl-6 font-mono text-[10px] uppercase tracking-wider">Time</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider">Conversation</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider">Action</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider">Verdict</TableHead>
                    <TableHead className="pr-6 font-mono text-[10px] uppercase tracking-wider">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 10).map((c) => (
                    <TableRow key={callKey(c)} className={cn(
                      "transition-colors hover:bg-black/[0.02]",
                      flashKeys.has(callKey(c)) && "row-flash")}>
                      <TableCell className="pl-6 font-mono text-xs tabular-nums text-black/45">{c.ts.replace("T", " ").slice(0, 16)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.conv_id}</TableCell>
                      <TableCell className="font-medium">{c.action}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(c.verdict))}>{c.verdict}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate pr-6 text-black/45">{(c.reasons || []).join("; ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* feedback */}
      {comments.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Caller feedback</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comments.slice(0, 3).map((r) => (
              <Card key={r.session_id} className="card-3d card-3d-hover">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-3.5 transition-transform",
                          i < Math.round(r.rating / 2) ? "fill-amber-400 text-amber-400" : "text-black/15")} />
                      ))}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-black/45">{r.rating}/10</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">“{r.comment}”</p>
                  <p className="mt-2 font-mono text-[11px] text-black/35">{r.session_id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
