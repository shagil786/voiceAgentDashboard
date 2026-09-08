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
import { Loader2, Rocket, ShieldCheck, Sparkles, FileText, PlugZap } from "lucide-react"
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

  const passed = (deploy?.checks || []).filter((c) => c.passed).length
  const total = (deploy?.checks || []).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Create a new agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your business in plain words. Review what the agent will know and do — approve before anything goes live.
        </p>
      </header>

      {/* stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Stage
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                stage === n && "bg-primary text-primary-foreground",
                stage > n && "bg-emerald-600 text-white",
                stage < n && "bg-muted text-muted-foreground")}>
                {stage > n ? "✓" : n}
              </span>
              <span className={cn("hidden text-sm font-medium sm:block",
                stage >= n ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> What should the agent know?</CardTitle>
            <CardDescription>Paste your website URL (public pages are read) or a plain description. Both work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="srcUrl">Website URL</Label>
              <Input id="srcUrl" placeholder="https://yourbusiness.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <span className="relative bg-card px-2 text-xs text-muted-foreground">and/or paste text</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="srcText">Describe your business</Label>
              <Textarea id="srcText" placeholder="e.g. Sunrise Dental Clinic offers root canals and cleanings, open 9am–6pm weekdays. Patients book, ask about prices, and cancel visits…"
                value={text} onChange={(e) => setText(e.target.value)} rows={5} />
              <p className="text-xs text-muted-foreground">{text.trim().length}/8000 characters</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="offering">What do you offer?</Label>
                <Input id="offering" placeholder="dental clinic appointments" value={offering} onChange={(e) => setOffering(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asks">Top customer asks</Label>
                <Input id="asks" placeholder="booking, price, cancel" value={asks} onChange={(e) => setAsks(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">Preview compiles instantly — nothing is written or approved.</p>
              <Button onClick={() => void compile()} disabled={!canPreview}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                Preview the agent <span className="ml-1.5">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 2 && (busy || !preview ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-36" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-emerald-600" /> Review before anything goes live</CardTitle>
              <CardDescription>This is a <b>proposal</b> — compiled for your review, not executed. Approving on the next step activates it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-muted-foreground" /> Knowledge it will answer from</h3>
                {(preview.knowledge || []).length === 0 && <p className="text-sm text-muted-foreground">No knowledge extracted yet — the agent will answer from guardrails only.</p>}
                <div className="space-y-2">
                  {(preview.knowledge || []).slice(0, 5).map((k, i) => (
                    <div key={i} className="rounded-lg border p-3 text-sm">
                      <p className="line-clamp-2 text-muted-foreground">{k.text}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{k.source}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-muted-foreground" /> Tools it may propose <span className="text-xs font-normal text-muted-foreground">(policy-gated)</span></h3>
                {(preview.tools || []).length === 0 && <p className="text-sm text-muted-foreground">No tools proposed.</p>}
                <div className="space-y-2">
                  {(preview.tools || []).map((t) => (
                    <div key={t.name} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.description || "Policy-gated governed action."}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">{t.state || "proposed"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStage(1)}>← Back</Button>
                <Button onClick={() => void approve()} disabled={!canApprove}>
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />} Looks right — approve &amp; deploy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {stage === 3 && deploy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className={cn("size-4", deploy.live ? "text-emerald-600" : "text-amber-600")} />
              {deploy.live ? "Agent is live" : "Self-checks didn't fully pass"}
            </CardTitle>
            <CardDescription>{deploy.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="text-sm font-medium">Self-checks</span>
              <Badge variant={passed === total ? "default" : "destructive"}>{passed}/{total} passed</Badge>
            </div>
            {(deploy.checks || []).map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{c.name}</span>
                <Badge variant={c.passed ? "secondary" : "destructive"}>{c.passed ? "passed" : "failed"}</Badge>
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStage(1); setPreview(null); setDeploy(null) }}>Start another agent</Button>
              {deploy.live && <Button onClick={() => (window.location.href = "/")}>Go to dashboard</Button>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
