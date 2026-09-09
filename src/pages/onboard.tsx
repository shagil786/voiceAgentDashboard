import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Rocket, Sparkles, FileText, PlugZap } from "lucide-react"
import { api, getConfig } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Preview {
  tools: { name: string; state: string; description?: string }[]
  knowledge: { source?: string; text?: string }[]
  evals: { name: string; turns?: number }[]
  note?: string
}
interface DeployResult {
  checks: { name: string; passed: boolean; detail?: string }[]
  live: boolean
  summary: string
}

type Stage = 1 | 2 | 3
const STEPS = ["Feed your business", "Review the proposal", "Approve & go live"]

export function OnboardPage() {
  const [stage, setStage] = useState<Stage>(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [offering, setOffering] = useState("")
  const [asks, setAsks] = useState("")

  const [preview, setPreview] = useState<Preview | null>(null)
  const [deploy, setDeploy] = useState<DeployResult | null>(null)

  const notConnected = !getConfig()
  const hasSource = Boolean(url.trim() || text.trim())
  const canPreview = hasSource && !notConnected && !busy
  const canApprove = Boolean(preview) && !busy

  function body() {
    const source: Record<string, string> = {}
    if (url.trim()) source.url = url.trim()
    if (text.trim()) source.text = text.trim()
    return { source, interview: { offering: offering.trim(), top_asks: asks.split(",").map((s) => s.trim()).filter(Boolean) } }
  }

  async function compile() {
    setErr(null); setBusy(true)
    try {
      const out = await api.onboardPreview(body())
      setPreview(out as unknown as Preview)
      setStage(2)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  async function approve() {
    setErr(null); setBusy(true)
    try {
      const out = await api.onboardDeploy({ ...body(), deploy_id: `owner-${Date.now()}` })
      setDeploy(out)
      setStage(3)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }


  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">New agent</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Describe your business.</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The agent compiles what it will know and do from what you tell it. You review the proposal — nothing goes live until you approve it.
        </p>
      </header>

      <ol className="flex items-center gap-3">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Stage
          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  stage === n && "border-primary bg-primary text-primary-foreground",
                  stage > n && "border-emerald-600/30 bg-emerald-600/10 text-emerald-700",
                  stage < n && "border-border bg-card text-muted-foreground")}>
                  {stage > n ? "✓" : n}
                </span>
                <span className={cn("hidden text-sm sm:block",
                  stage >= n ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {n < 3 && <Separator className="flex-1" />}
            </li>
          )
        })}
      </ol>

      {notConnected && (
        <Alert>
          <PlugZap className="size-4" />
          <AlertTitle>Connect the console to an agent first</AlertTitle>
          <AlertDescription>
            The wizard compiles against your agent's control API. <a className="font-medium underline underline-offset-2" href="/connect">Connection page →</a>
          </AlertDescription>
        </Alert>
      )}

      {err && (
        <Alert variant="destructive">
          <AlertTitle>That didn't work</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {stage === 1 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardDescription className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 1 — input</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="srcUrl">Website URL</Label>
              <Input id="srcUrl" placeholder="https://yourbusiness.com" value={url} onChange={(e) => setUrl(e.target.value)} className="h-10" />
            </div>
            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <span className="relative bg-card px-2 text-xs text-muted-foreground">and/or describe it in your own words</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="srcText">Business description</Label>
              <Textarea id="srcText" placeholder="e.g. Sunrise Dental Clinic offers root canals and cleanings, open 9am–6pm weekdays. Patients book, ask about prices, and cancel visits…"
                value={text} onChange={(e) => setText(e.target.value)} rows={5} className="resize-none" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Plain language works best — prices, hours, policies.</span>
                <span className="font-mono tabular-nums">{text.trim().length}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="offering">What do you offer?</Label>
                <Input id="offering" placeholder="dental clinic appointments" value={offering} onChange={(e) => setOffering(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asks">Top customer asks</Label>
                <Input id="asks" placeholder="booking, price, cancel" value={asks} onChange={(e) => setAsks(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <p className="max-w-[55%] text-xs leading-relaxed text-muted-foreground">
                The preview compiles instantly and writes nothing — you review before anything is approved.
              </p>
              <Button size="lg" onClick={() => void compile()} disabled={!canPreview} className="h-10 px-6">
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                Preview the agent <span className="ml-1">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 2 && (busy || !preview ? (
        <Card className="shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardDescription className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700">Step 2 — review the proposal</CardDescription>
              <CardTitle className="mt-1 text-xl">This is what the agent will know and do.</CardTitle>
              <CardDescription>Compiled for your review. Nothing is live — approval happens below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-muted-foreground" /> Knowledge</h3>
                {(preview.knowledge || []).length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No knowledge extracted yet — the agent would answer from its guardrails only.
                  </p>
                )}
                <div className="space-y-2">
                  {(preview.knowledge || []).slice(0, 5).map((k, i) => (
                    <div key={i} className="rounded-lg border bg-card p-3.5">
                      <p className="text-sm leading-relaxed">{k.text}</p>
                      <p className="mt-1.5 font-mono text-xs text-muted-foreground">{k.source}</p>
                    </div>
                  ))}
                </div>
              </section>
              <Separator />
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-muted-foreground" /> Tools <span className="font-normal text-muted-foreground">— every call policy-gated and logged</span></h3>
                {(preview.tools || []).length === 0 && <p className="text-sm text-muted-foreground">No tools proposed.</p>}
                <div className="space-y-2">
                  {(preview.tools || []).map((t) => (
                    <div key={t.name} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3.5">
                      <div>
                        <p className="font-mono text-sm font-medium">{t.name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t.description || "Policy-gated governed action."}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">{t.state || "proposed"}</Badge>
                    </div>
                  ))}
                </div>
              </section>
              <div className="flex items-center justify-between border-t pt-5">
                <Button variant="ghost" onClick={() => setStage(1)}>← Edit input</Button>
                <Button size="lg" className="h-10 px-6" onClick={() => void approve()} disabled={!canApprove}>
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Approve &amp; deploy <Rocket className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {stage === 3 && deploy && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardDescription className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 3 — result</CardDescription>
            <CardTitle className={cn("mt-1 flex items-center gap-2 text-2xl", deploy.live ? "text-emerald-700" : "text-amber-700")}>
              <Rocket className="size-6" /> {deploy.live ? "Your agent is live." : "Almost — checks need attention."}
            </CardTitle>
            <CardDescription className="text-sm">{deploy.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(deploy.checks || []).map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <span className="text-sm font-medium">{c.name}</span>
                <Badge variant={c.passed ? "secondary" : "destructive"} className="font-mono text-[11px]">{c.passed ? "passed" : "failed"}</Badge>
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <Button variant="outline" onClick={() => { setStage(1); setPreview(null); setDeploy(null) }}>Start another</Button>
              {deploy.live && <Button className="flex-1" onClick={() => (window.location.href = "/")}>Go to dashboard</Button>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
