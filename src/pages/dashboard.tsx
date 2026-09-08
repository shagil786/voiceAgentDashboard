import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, TrendingUp, Star, Headset, PhoneCall, ArrowUpRight, PlugZap } from "lucide-react"
import { api, getConfig, type CallRow, type RatingRow, type Summary } from "@/lib/api"
import { cn } from "@/lib/utils"

type Data = { summary: Summary; calls: CallRow[]; ratings: RatingRow[] }
type Phase = "loading" | "live" | "empty" | "demo" | "error"

function verdictClass(v: string) {
  const s = v.toUpperCase()
  if (s.includes("ALLOW")) return "text-emerald-600"
  if (s.includes("ESCALATE")) return "text-amber-600"
  if (s.includes("DENY")) return "text-red-600"
  return ""
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </CardContent>
    </Card>
  )
}

function Kpi({ label, value, icon: Icon, hint, accent }: {
  label: string; value: string; icon: typeof PhoneCall; hint: string; accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className={cn("size-4", accent ? "text-primary" : "text-muted-foreground")} />
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <PlugZap className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No agent connected</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Connect this console to your agent's control API and real call data —
          decisions, ratings, escalations — will appear here as calls happen.
        </p>
        <Button className="mt-6" onClick={onConnect}>
          <PlugZap className="size-4 mr-2" /> Connect an agent
        </Button>
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
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
      setPhase(summary.calls > 0 ? "live" : "empty")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("error")
    }
  }
  useEffect(() => { void load() }, [])

  const goToConnect = () => { window.location.href = "/connect" }

  // loading: skeletons, no fake data
  if (phase === "loading") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reading your agent's decision log…</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent decisions</CardTitle>
            <CardDescription>Loading governed decisions…</CardDescription>
          </CardHeader>
          <CardContent><TableSkeleton /></CardContent>
        </Card>
      </div>
    )
  }

  // not connected / empty store: honest empty states
  if (phase === "empty") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        </header>
        <EmptyState onConnect={goToConnect} />
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        </header>
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

  // live (or store-present-but-empty handled above)
  const { summary: s, calls, ratings } = data!
  const verdictTotal = Math.max(1, Object.values(s.verdicts).reduce((a, b) => a + b, 0))
  const verdicts = Object.entries(s.verdicts).sort((a, b) => b[1] - a[1])
  const comments = ratings.filter((r) => r.comment)

  const kpis = [
    { label: "Calls handled", value: s.calls.toLocaleString(), icon: PhoneCall, hint: `${s.conversations.toLocaleString()} conversations`, accent: false },
    { label: "Avg rating", value: s.avg_rating_10 != null ? `${s.avg_rating_10.toFixed(1)}/10` : "–", icon: Star, hint: `${s.ratings} rated calls`, accent: false },
    { label: "Escalation", value: s.escalation_rate != null ? `${Math.round(s.escalation_rate * 100)}%` : "–", icon: Headset, hint: "to human agents", accent: false },
    { label: "Allow rate", value: `${Math.round(((s.verdicts.ALLOW || 0) / verdictTotal) * 100)}%`, icon: TrendingUp, hint: "governed decisions", accent: true },
  ]

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            Live from your agent's decision log
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={false}>
          <RefreshCw className="size-3.5 mr-2" /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, hint, accent }) => (
          <Kpi key={label} label={label} value={value} icon={Icon} hint={hint} accent={accent} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent decisions</CardTitle>
              <CardDescription>Every governed action is policy-gated and logged.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">View all <ArrowUpRight className="size-3.5 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No decisions logged yet — they appear as your agent handles calls.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Conversation</TableHead>
                    <TableHead>Action</TableHead><TableHead>Verdict</TableHead><TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 8).map((c) => (
                    <TableRow key={c.conv_id + c.ts}>
                      <TableCell className="font-mono text-xs">{c.ts.replace("T", " ").slice(0, 16)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.conv_id}</TableCell>
                      <TableCell>{c.action}</TableCell>
                      <TableCell><Badge variant="outline" className={verdictClass(c.verdict)}>{c.verdict}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{(c.reasons || []).join("; ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verdict mix</CardTitle>
              <CardDescription>Share of governed outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {verdicts.length === 0 && <p className="text-sm text-muted-foreground">No decisions yet.</p>}
              {verdicts.map(([v, n]) => {
                const pct = Math.round((n / verdictTotal) * 100)
                const color = v.includes("ALLOW") ? "bg-emerald-500" : v.includes("ESCALATE") ? "bg-amber-500" : v.includes("DENY") ? "bg-red-500" : "bg-muted-foreground"
                return (
                  <div key={v}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{v}</span><span className="text-muted-foreground">{n.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Caller feedback</CardTitle>
              <CardDescription>{comments.length ? `${comments.length} comments` : "no comments yet"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Ratings with comments appear here once callers leave feedback.</p>
              )}
              {comments.slice(0, 3).map((r) => (
                <div key={r.session_id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" /> {r.rating}/10
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{r.session_id}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">“{r.comment}”</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
