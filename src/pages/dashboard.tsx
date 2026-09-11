import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, ArrowUpRight, PlugZap, Star, ArrowRight, ListChecks, BarChart3, PhoneCall, Headset, TrendingUp } from "lucide-react"
import { AnimatedCounter, SpotlightCard, Stagger, StaggerItem } from "@/components/motion-primitives"
import { api, getConfig, type CallRow, type ConvScore, type RatingRow, type Summary } from "@/lib/api"
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
        <span key={i} className="w-1.5 rounded-full bg-[#e63e0b] transition-all duration-500"
          style={{ height: `${h}px`, animation: `wave 1.6s ease-in-out ${i * 0.09}s infinite`, opacity: 0.55 + (i % 3) * 0.15 }} />
      ))}
      <style>{`@keyframes wave { 0%,100% { transform: scaleY(0.55); } 50% { transform: scaleY(1); } }`}</style>
    </div>
  )
}

const STEPS = [
  { icon: PlugZap, title: "Connect", desc: "Point the console at your agent's control API." },
  { icon: ListChecks, title: "Onboard", desc: "Describe your business — the agent compiles its knowledge and tools." },
  { icon: BarChart3, title: "Operate", desc: "Decisions, ratings and escalations stream in live once the agent runs." },
]

export function DashboardPage() {
  const nav = useNavigate()
  const [data, setData] = useState<Data | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const [error, setError] = useState<string | null>(null)
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showAll, setShowAll] = useState(false)
  // quality panel is independent: judge scoring is slow, must not gate the page
  const [scores, setScores] = useState<ConvScore[] | null>(null)
  const [scoresError, setScoresError] = useState<string | null>(null)

  const callKey = (c: CallRow) => `${c.conv_id}:${c.ts}`

  // Decision-log reasons repeat the action ("action 'order_status' allowed by
  // policy; ...") — strip the redundant prefix so the column shows the part
  // that actually differs between rows.
  function shortReason(c: CallRow) {
    const full = (c.reasons || []).join("; ")
    if (!full) return "—"
    const m = full.match(/^action '([^']+)' (?:allowed|denied|escalated|challenged)[^;]*;?\s*(.*)$/)
    if (m && m[1] === c.action) return m[2] || full
    return full
  }

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
    const calls = [...fresh, ...prev.calls].slice(0, 30)
    setLastUpdate(new Date())
    return { summary, calls, ratings: prev.ratings }
  }

  async function load() {
    setPhase("loading"); setError(null)
    if (!getConfig()) { setPhase("empty"); return }
    try {
      const [summary, calls, ratings] = await Promise.all([
        api.summary(), api.calls(100), api.ratings(50),
      ])
      setData({ summary, calls: calls.calls, ratings: ratings.ratings })
      setLastUpdate(new Date())
      setPhase("live")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }
  useEffect(() => { void load() }, [])

  // quality scores load independently (judge is slow; never gate the page on it)
  useEffect(() => {
    if (phase !== "live") return
    let cancelled = false
    api.scores()
      .then((res) => { if (!cancelled) { setScores(res.scores); setScoresError(null) } })
      .catch((e) => { if (!cancelled) setScoresError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [phase])

  // live decision streaming
  useEffect(() => {
    if (phase !== "live") return
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return
      try {
        const { calls: latest } = await api.calls(20)
        setData((prev) => (prev ? mergeFresh(prev, latest) : prev))
      } catch { /* transient */ }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [phase])

  const goToConnect = () => nav("/connect")

  if (phase === "loading") {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-44" />
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-40 rounded-2xl lg:col-span-6" />
          <Skeleton className="h-40 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-40 rounded-2xl lg:col-span-3" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (phase === "empty") {
    return (
      <div className="mx-auto max-w-4xl pt-6">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e63e0b]">VoiceAgent Console</p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Your agent's live <em className="font-serif font-normal italic text-[#e63e0b]">heartbeat</em>,
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
              <Button size="lg" onClick={goToConnect} className="h-11 gap-2 rounded-full bg-[#171409] px-7 text-white hover:bg-black hover:shadow-lg hover:shadow-black/20">
                Connect your agent <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <SpotlightCard key={title} className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#171409] text-[#e63e0b]">
                  <Icon className="size-4" />
                </span>
                <span className="font-mono text-[11px] text-black/35">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-black/50">{desc}</p>
            </SpotlightCard>
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
  const allowRate = Math.round(((s.verdicts.ALLOW || 0) / verdictTotal) * 100)

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e63e0b]">Overview</p>
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
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-3.5 mr-2" /> Refresh
        </Button>
      </header>

      {/* ── bento hero ─────────────────────────────────────────── */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {/* calls — the big tile */}
        <StaggerItem className="lg:col-span-6">
          <SpotlightCard className="h-full p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#e63e0b]/10 text-[#e63e0b]">
                <PhoneCall className="size-4" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">calls handled</span>
            </div>
            <p className="mt-5 text-6xl font-semibold tracking-[-0.03em]">
              <AnimatedCounter value={s.calls} duration={1.8} />
            </p>
            <p className="mt-3 text-sm text-black/45">
              across <span className="font-medium text-black/75">{s.conversations.toLocaleString()}</span> conversations
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
              <TrendingUp className="size-3.5" /> {allowRate}% allow rate
            </div>
          </SpotlightCard>
        </StaggerItem>

        {/* rating */}
        <StaggerItem className="lg:col-span-3">
          <SpotlightCard className="h-full p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-500">
                <Star className="size-4" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">rating</span>
            </div>
            <p className="mt-5 text-5xl font-semibold tracking-tight">
              {s.avg_rating_10 != null ? (
                <AnimatedCounter value={s.avg_rating_10} decimals={1} suffix="/10" duration={1.4} />
              ) : "—"}
            </p>
            <div className="mt-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("size-3.5", i < Math.round((s.avg_rating_10 ?? 0) / 2) ? "fill-amber-400 text-amber-400" : "text-black/10")} />
              ))}
            </div>
            <p className="mt-2 text-xs text-black/40">{s.ratings} rated calls</p>
          </SpotlightCard>
        </StaggerItem>

        {/* escalation + containment stacked */}
        <StaggerItem className="lg:col-span-3">
          <SpotlightCard className="h-full p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Headset className="size-4" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">escalation</span>
            </div>
            <p className="mt-5 text-5xl font-semibold tracking-tight">
              {s.escalation_rate != null ? (
                <AnimatedCounter value={s.escalation_rate * 100} decimals={0} suffix="%" duration={1.4} />
              ) : "—"}
            </p>
            <p className="mt-3 text-xs text-black/40">routed to human agents</p>
          </SpotlightCard>
        </StaggerItem>

        {/* verdict mix — wide bottom strip */}
        <StaggerItem className="sm:col-span-2 lg:col-span-12">
          <SpotlightCard className="p-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {verdicts.map(([v, n]) => {
                const pct = Math.round((n / verdictTotal) * 100)
                const color = v.includes("ALLOW") ? "bg-emerald-500" : v.includes("ESCALATE") ? "bg-amber-500" : v.includes("DENY") ? "bg-red-500" : "bg-slate-400"
                return (
                  <div key={v} className="min-w-[180px] flex-1">
                    <div className="mb-1.5 flex items-center justify-between">
                      <Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(v))}>{v}</Badge>
                      <span className="text-xs tabular-nums text-black/45">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </SpotlightCard>
        </StaggerItem>
      </Stagger>

      {/* decisions table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent decisions</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}
            className="text-black/45 hover:text-black">
            {showAll ? "Show less" : "All decisions"} <ArrowUpRight className="ml-1 size-3.5" />
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
                  {(showAll ? calls : calls.slice(0, 10)).map((c) => (
                    <TableRow key={callKey(c)} className={cn("group/row transition-all hover:bg-black/[0.045]", flashKeys.has(callKey(c)) && "row-flash")}>
                      <TableCell className="pl-6 font-mono text-xs tabular-nums text-black/45 transition-colors group-hover/row:text-[#e63e0b]">{c.ts.replace("T", " ").slice(0, 16)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.conv_id}</TableCell>
                      <TableCell className="font-medium">{c.action}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(c.verdict))}>{c.verdict}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate pr-6 text-black/45" title={(c.reasons || []).join("; ") || "no reason recorded"}>{shortReason(c)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* quality: LLM-judge rubric scores — independent, judge is slow */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Quality scores</h2>
          <span className="font-mono text-[11px] uppercase tracking-wider text-black/35">
            {scores && scores.length ? `rubric · ${scores[0]?.source ?? ""}` : scoresError ? "judge unavailable" : "judging…"}
          </span>
        </div>
        {scoresError ? (
          <Card className="rounded-xl border-dashed">
            <CardContent className="flex items-center justify-between gap-4 py-6">
              <p className="text-sm text-black/55">Judge scoring failed: {scoresError}</p>
              <Button variant="outline" size="sm" onClick={() => {
                setScoresError(null); setScores(null)
                api.scores()
                  .then((res) => { setScores(res.scores) })
                  .catch((e) => setScoresError(e instanceof Error ? e.message : String(e)))
              }}>
                <RefreshCw className="size-3.5 mr-2" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : !scores ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : scores.length === 0 ? (
          <Card className="rounded-xl border-dashed">
            <CardContent className="py-8 text-center text-sm text-black/45">
              Per-conversation quality scores appear here once calls are scored by the judge.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {scores.slice(0, 3).map((sc) => (
              <SpotlightCard key={sc.conv_id} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold tracking-tight">
                    {sc.overall != null ? sc.overall.toFixed(1) : "—"}
                    <span className="text-sm font-normal text-black/35">/10</span>
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] text-black/45">{sc.source}</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-black/40">{sc.conv_id}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-black/50">{sc.reasoning}</p>
              </SpotlightCard>
            ))}
          </div>
        )}
      </section>

      {/* feedback */}
      {comments.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Caller feedback</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comments.slice(0, 3).map((r) => (
              <SpotlightCard key={r.session_id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("size-3.5", i < Math.round(r.rating / 2) ? "fill-amber-400 text-amber-400" : "text-black/15")} />
                    ))}
                  </div>
                  <span className="font-mono text-xs tabular-nums text-black/45">{r.rating}/10</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">“{r.comment}”</p>
                <p className="mt-2 font-mono text-[11px] text-black/35">{r.session_id}</p>
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
