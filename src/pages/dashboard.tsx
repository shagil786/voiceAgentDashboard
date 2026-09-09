import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, ArrowUpRight, PlugZap, Star } from "lucide-react"
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

export function DashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setPhase("loading"); setError(null)
    if (!getConfig()) { setPhase("empty"); return }
    try {
      const [summary, calls, ratings] = await Promise.all([api.summary(), api.calls(100), api.ratings(50)])
      setData({ summary, calls: calls.calls, ratings: ratings.ratings })
      setPhase("live")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }
  useEffect(() => { void load() }, [])

  const goToConnect = () => { window.location.href = "/connect" }

  if (phase === "loading") {
    return (
      <div className="space-y-10">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (phase === "empty") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your console is empty — on purpose.</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          No agent is connected yet. Once one is, every governed decision, caller rating and
          escalation lands here in real time. Nothing fake, ever.
        </p>
        <Button className="mt-8 h-11 px-6" onClick={goToConnect}>
          <PlugZap className="mr-2 size-4" /> Connect your agent
        </Button>
        <p className="mt-6 font-mono text-xs text-muted-foreground">01 / connect · 02 / onboard · 03 / operate</p>
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
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live from the decision log
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={false}>
          <RefreshCw className="size-3.5 mr-2" /> Refresh
        </Button>
      </header>

      {/* hero metrics: big numeric panel + two stacked, asymmetric */}
      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr_1fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary/5" />
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-[0.15em]">Calls handled</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-semibold tracking-[-0.03em] tabular-nums">{s.calls.toLocaleString()}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              across <span className="font-medium text-foreground">{s.conversations.toLocaleString()}</span> conversations
              · <span className="font-medium text-foreground">{Math.round(((s.verdicts.ALLOW || 0) / verdictTotal) * 100)}%</span> allowed
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.15em]">
                Avg rating <Star className="size-3.5 fill-amber-400 text-amber-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {s.avg_rating_10 != null ? s.avg_rating_10.toFixed(1) : "—"}
                {s.avg_rating_10 != null && <span className="text-lg font-normal text-muted-foreground">/10</span>}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{s.ratings} rated calls</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="font-mono text-xs uppercase tracking-[0.15em]">Escalation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {s.escalation_rate != null ? `${Math.round(s.escalation_rate * 100)}%` : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">routed to humans</p>
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-[0.15em]">Verdict mix</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            {verdicts.map(([v, n]) => {
              const pct = Math.round((n / verdictTotal) * 100)
              const color = v.includes("ALLOW") ? "bg-emerald-500" : v.includes("ESCALATE") ? "bg-amber-500" : v.includes("DENY") ? "bg-red-500" : "bg-slate-400"
              return (
                <div key={v}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(v))}>{v}</Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
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
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            All decisions <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        </div>
        <Card>
          <CardContent className="px-0">
            {calls.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No decisions logged yet — they appear as your agent handles calls.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Conversation</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="pr-6">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 8).map((c) => (
                    <TableRow key={c.conv_id + c.ts}>
                      <TableCell className="pl-6 font-mono text-xs tabular-nums text-muted-foreground">{c.ts.replace("T", " ").slice(0, 16)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.conv_id}</TableCell>
                      <TableCell className="font-medium">{c.action}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("font-mono text-[11px]", verdictClass(c.verdict))}>{c.verdict}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate pr-6 text-muted-foreground">{(c.reasons || []).join("; ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* feedback strip */}
      {comments.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Caller feedback</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comments.slice(0, 3).map((r) => (
              <Card key={r.session_id}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-3.5",
                          i < Math.round(r.rating / 2) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{r.rating}/10</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">“{r.comment}”</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{r.session_id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
