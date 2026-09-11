import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Rocket, Sparkles, FileText, PlugZap, ShieldCheck, BookOpenText, Wrench, ScrollText } from "lucide-react"
import { api, getConfig } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MagneticButton, Stagger, StaggerItem } from "@/components/motion-primitives"

interface PreviewQuestion {
  id: string; prompt: string; why?: string; kind?: string; options?: string[]; answer_key?: string
}
interface Preview {
  tools: { name: string; state: string; description?: string }[]
  knowledge: { source?: string; text?: string }[]
  evals: { name: string; turns?: number }[]
  questions?: PreviewQuestion[]
  drafted?: boolean
  intents?: Record<string, string[]>
  entities?: { record_ids?: { code: string }[] } | null
  note?: string
}
interface DeployResult {
  checks: { name: string; passed: boolean; detail?: string }[]
  live: boolean
  summary: string
}

type Stage = 1 | 2 | 3

const DRAFT_KEY = "voiceagent.onboardDraft.v1"

function loadDraft(): { url: string; text: string; offering: string; asks: string; answers: Record<string, string> } {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}")
    return {
      url: d.url ?? "", text: d.text ?? "", offering: d.offering ?? "",
      asks: d.asks ?? "", answers: d.answers ?? {},
    }
  } catch { return { url: "", text: "", offering: "", asks: "", answers: {} } }
}
const STEPS = ["Feed your business", "Review the proposal", "Approve & go live"]

// One-click starting points (landing's "Try:" pattern): fills the step-1
// fields so the preview is one click away. Neutral, varied trades.
const TRY_PRESETS = [
  {
    label: "bakery",
    text: "Maple Street Bakery bakes sourdough and pastries, open 7am–3pm Tue–Sun. Customers ask about today's menu, pre-orders, and catering…",
    offering: "fresh bread, pre-orders and catering",
    asks: "menu, pre-order, catering",
  },
  {
    label: "plumber",
    text: "RapidFlow Plumbing does home repairs across the city, open 8am–8pm daily. Customers book visits, ask about prices, and reschedule…",
    offering: "home repairs and scheduling",
    asks: "pricing, timing, changes",
  },
  {
    label: "clinic",
    text: "Lakeside Physio treats sports injuries, open 9am–6pm weekdays. Patients book sessions, ask about plans, and move appointments…",
    offering: "sessions, plans and rebooking",
    asks: "plans, timing, rebook",
  },
]

/** What the compiled agent produces — shown as a live rail beside the form. */
const OUTPUT_CARD = [
  { icon: BookOpenText, title: "Knowledge", desc: "Your site and description, distilled into cited facts it answers from." },
  { icon: Wrench, title: "Tools", desc: "Actions it may take — each policy-gated, precondition-checked, logged." },
  { icon: ShieldCheck, title: "Guardrails", desc: "No invented facts, no over-promises. Human escalation always open." },
]

export function OnboardPage() {
  const nav = useNavigate()
  const [stage, setStage] = useState<Stage>(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Draft persistence: a refresh or accidental navigation must not eat the
  // wizard input. Cleared on "Start another" / successful deploy.
  const [url, setUrl] = useState(() => loadDraft().url)
  const [text, setText] = useState(() => loadDraft().text)
  const [offering, setOffering] = useState(() => loadDraft().offering)
  const [asks, setAsks] = useState(() => loadDraft().asks)

  const [preview, setPreview] = useState<Preview | null>(null)
  const [deploy, setDeploy] = useState<DeployResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>(() => loadDraft().answers)
  const [acceptedNote, setAcceptedNote] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ url, text, offering, asks, answers })) } catch { /* private mode */ }
  }, [url, text, offering, asks, answers])

  const notConnected = !getConfig()
  const hasSource = Boolean(url.trim() || text.trim())
  const canPreview = hasSource && !notConnected && !busy
  const canApprove = Boolean(preview) && !busy

  function body() {
    const source: Record<string, string> = {}
    if (url.trim()) source.url = url.trim()
    if (text.trim()) source.text = text.trim()
    // Gap answers overlay the step-1 fields by answer_key.
    const interview: Record<string, string | string[]> = {
      offering: offering.trim(),
      top_asks: asks.split(",").map((s) => s.trim()).filter(Boolean),
    }
    for (const [k, v] of Object.entries(answers)) {
      if (v.trim()) interview[k] = v.trim()
    }
    return { source, interview }
  }

  async function compile() {
    setErr(null); setBusy(true); setAcceptedNote(null)
    try {
      const out = await api.onboardPreview(body())
      const next = out as unknown as Preview
      const before = preview?.questions?.length ?? 0
      const after = next.questions?.length ?? 0
      if (preview && after < before) {
        setAcceptedNote(`Answers accepted — ${before - after} fewer open questions.`)
      }
      setPreview(next)
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
    <div className="space-y-8">
      <Stagger className="space-y-8" delay={0.03}>
      <StaggerItem>
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e63e0b]">New agent</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Describe your <em className="font-serif font-normal italic text-[#e63e0b]">business</em>.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-black/55">
          The agent compiles what it will know and do from what you tell it.
          You review the proposal — nothing goes live until you approve it.
        </p>
      </header>

      <ol className="flex items-center gap-3">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Stage
          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition-colors",
                  stage === n && "border-[#e63e0b] bg-[#e63e0b] text-white",
                  stage > n && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                  stage < n && "border-black/10 bg-white text-black/40")}>
                  {stage > n ? "✓" : n}
                </span>
                <span className={cn("hidden text-sm sm:block",
                  stage >= n ? "font-medium text-black/85" : "text-black/40")}>
                  {label}
                </span>
              </div>
              {n < 3 && <Separator className="flex-1 bg-black/8" />}
            </li>
          )
        })}
      </ol>
      </StaggerItem>
      </Stagger>

      {err && (
        <Alert variant="destructive">
          <AlertTitle>That didn't work</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* ── two-column: form + live output rail ─────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        {/* left: the wizard */}
        <div className="space-y-6">
          {notConnected && (
            <Alert className="border-[#e63e0b]/25 bg-[#e63e0b]/[0.04]">
              <PlugZap className="size-4 text-[#e63e0b]" />
              <AlertTitle className="text-[14px]">Connect the console first</AlertTitle>
              <AlertDescription className="text-[13px] text-black/55">
                The wizard compiles against your agent's control API.{" "}
                <a className="font-semibold text-[#e63e0b] underline underline-offset-2 hover:text-black" href="/connect">Connection page →</a>
              </AlertDescription>
            </Alert>
          )}

          {stage === 1 && (
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#e63e0b]">Step 1 — input</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="srcUrl" className="text-[13px] font-medium text-black/70">Website URL</Label>
                  <Input id="srcUrl" placeholder="https://yourbusiness.com" value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-11 rounded-xl border-black/10 bg-white shadow-none transition-all hover:border-black/25 focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
                </div>
                <div className="relative text-center">
                  <div className="absolute inset-0 flex items-center"><Separator className="bg-black/6" /></div>
                  <span className="relative bg-white px-2 text-[12px] text-black/40">or describe it in your own words</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srcText" className="text-[13px] font-medium text-black/70">Business description</Label>
                  <Textarea id="srcText"
                    placeholder="e.g. Acme Home Services does plumbing repairs across the city, open 8am–8pm daily. Customers book visits, ask about prices, and reschedule…"
                    value={text} onChange={(e) => setText(e.target.value)} rows={5}
                    className="resize-none rounded-xl border-black/10 bg-white shadow-none transition-all hover:border-black/25 focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
                  <div className="flex justify-between text-[12px] text-black/40">
                    <span>Plain language works best — prices, hours, policies.</span>
                    <span className="font-mono tabular-nums">{text.trim().length}</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="offering" className="text-[13px] font-medium text-black/70">What do you offer?</Label>
                    <Input id="offering" placeholder="repairs, pricing and scheduling" value={offering}
                      onChange={(e) => setOffering(e.target.value)}
                      className="h-11 rounded-xl border-black/10 bg-white shadow-none transition-all hover:border-black/25 focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="asks" className="text-[13px] font-medium text-black/70">Top customer asks</Label>
                    <Input id="asks" placeholder="hours, pricing, changes" value={asks}
                      onChange={(e) => setAsks(e.target.value)}
                      className="h-11 rounded-xl border-black/10 bg-white shadow-none transition-all hover:border-black/25 focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Try:</span>
                  {TRY_PRESETS.map((p) => (
                    <button key={p.label} type="button"
                      onClick={() => { setText(p.text); setOffering(p.offering); setAsks(p.asks) }}
                      className="rounded-full border border-black/12 px-3 py-1.5 font-mono text-[11px] text-black/55 transition-colors hover:border-[#e63e0b] hover:text-[#e63e0b]">
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-black/6 pt-4">
                  <p className="max-w-[55%] text-[12px] leading-relaxed text-black/45">
                    {!canPreview
                      ? "Add a website or a few lines of description to enable the preview."
                      : "The preview writes nothing. You review before anything is approved."}
                  </p>
                  <MagneticButton strength={0.12}>
                  <Button size="lg" onClick={() => void compile()} disabled={!canPreview}
                    className="h-11 rounded-full bg-[#171409] px-6 text-white shadow-[0_8px_30px_-12px_rgba(23,20,9,0.5)] transition-all hover:bg-black hover:shadow-[0_14px_40px_-12px_rgba(23,20,9,0.6)] disabled:opacity-40">
                    {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Preview <span className="ml-1">→</span>
                  </Button>
                  </MagneticButton>
                </div>
              </CardContent>
            </Card>
          )}

          {stage === 2 && (busy || !preview ? (
            <Card className="card-3d">
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : (
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-600">Step 2 — review</CardDescription>
                <CardTitle className="mt-1 text-xl">What the agent will know and do.</CardTitle>
                <CardDescription className="text-[13px] text-black/50">Compiled for your review. Nothing is live until you approve.</CardDescription>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full bg-black/5 font-mono text-[11px] text-black/55">
                    {preview.drafted ? "brain-drafted" : "template"}
                  </Badge>
                  {(preview.entities?.record_ids || []).map((r) => (
                    <Badge key={r.code} variant="secondary" className="rounded-full bg-black/5 font-mono text-[11px] text-black/55">
                      IDs: {r.code}
                    </Badge>
                  ))}
                  {preview.intents && (
                    <Badge variant="secondary" className="rounded-full bg-black/5 font-mono text-[11px] text-black/55">
                      {Object.keys(preview.intents).length} intents
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-black/40" /> Knowledge</h3>
                  {(preview.knowledge || []).length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/12 p-4 text-sm text-black/45">
                      No knowledge extracted yet — the agent would answer from its guardrails only.
                    </p>
                  )}
                  <div className="space-y-2">
                    {(preview.knowledge || []).slice(0, 5).map((k, i) => (
                      <div key={i} className="row-flat p-3.5">
                        <p className="text-sm leading-relaxed">{k.text}</p>
                        <p className="mt-1.5 font-mono text-xs text-black/40">{k.source}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <Separator className="bg-black/6" />
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-black/40" /> Tools
                    <span className="font-normal text-black/40">— policy-gated and logged</span>
                  </h3>
                  {(preview.tools || []).length === 0 && <p className="text-sm text-black/45">No tools proposed.</p>}
                  <div className="space-y-2">
                    {(preview.tools || []).map((t) => (
                      <div key={t.name} className="row-flat row-flat-hover flex items-start justify-between gap-3 p-3.5">
                        <div>
                          <p className="font-mono text-sm font-medium">{t.name}</p>
                          <p className="mt-0.5 text-sm text-black/50">{t.description || "Policy-gated governed action."}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 rounded-full bg-black/5 font-mono text-[11px] text-black/55">
                          {t.state || "proposed"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
                {(preview.questions || []).length > 0 && (
                <section>
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <PlugZap className="size-4 text-black/40" /> Questions for you
                    <span className="font-normal text-black/40">— the agent can't guess these</span>
                  </h3>
                  <p className="mb-3 text-[12px] text-black/45">Answer what you can, then re-preview — the proposal sharpens with every answer.</p>
                  <div className="space-y-2.5">
                    {(preview.questions || []).map((q) => (
                      <div key={q.id} className="row-flat p-3.5">
                        <p className="text-sm font-medium">{q.prompt}</p>
                        {q.why && <p className="mt-0.5 text-[12px] text-black/45">{q.why}</p>}
                        {q.options && q.options.length > 0 && (
                          <p className="mt-1 font-mono text-[11px] text-black/40">e.g. {q.options.slice(0, 4).join(", ")}</p>
                        )}
                        <Input
                          aria-label={q.prompt}
                          value={answers[q.answer_key || q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.answer_key || q.id]: e.target.value }))}
                          placeholder={q.kind === "multi" ? "comma-separated" : "your answer"}
                          className="mt-2 h-10 rounded-xl border-black/10 bg-white shadow-none transition-all hover:border-black/25 focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20"
                        />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => void compile()} disabled={!canPreview}
                    className="mt-3 rounded-full border-black/10 hover:bg-black/5">
                    {busy && <Loader2 className="size-4 mr-2 animate-spin" />} Re-preview with answers
                  </Button>
                  {acceptedNote && (
                    <p className="mt-2 text-[12px] font-medium text-emerald-600">{acceptedNote}</p>
                  )}
                </section>
                )}
                <div className="flex items-center justify-between border-t border-black/6 pt-4">
                  <Button variant="ghost" onClick={() => setStage(1)} className="text-black/60 hover:bg-black/5 hover:text-black">← Edit input</Button>
                  <MagneticButton strength={0.12}>
                  <Button size="lg" onClick={() => void approve()} disabled={!canApprove}
                    className="h-11 rounded-full bg-[#171409] px-6 text-white shadow-[0_8px_30px_-12px_rgba(23,20,9,0.5)] transition-all hover:bg-black hover:shadow-[0_14px_40px_-12px_rgba(23,20,9,0.6)]">
                    {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Approve &amp; deploy <Rocket className="ml-2 size-4" />
                  </Button>
                  </MagneticButton>
                </div>
              </CardContent>
            </Card>
          ))}

          {stage === 3 && deploy && (
            <Card className="card-3d">
              <CardHeader className="pb-4">
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/40">Step 3 — result</CardDescription>
                <CardTitle className={cn("mt-1 flex items-center gap-2 text-2xl", deploy.live ? "text-emerald-600" : "text-amber-600")}>
                  <Rocket className="size-6" /> {deploy.live ? "Your agent is live." : "Checks need attention."}
                </CardTitle>
                <CardDescription className="text-sm text-black/50">{deploy.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(deploy.checks || []).map((c) => (
                  <div key={c.name} className="row-flat flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge variant={c.passed ? "secondary" : "destructive"}
                      className="rounded-full bg-black/5 font-mono text-[11px] text-black/55">
                      {c.passed ? "passed" : "failed"}
                    </Badge>
                  </div>
                ))}
                <div className="flex gap-3 pt-3">
                  <Button variant="outline" onClick={() => {
                    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
                    setStage(1); setPreview(null); setDeploy(null)
                    setUrl(""); setText(""); setOffering(""); setAsks(""); setAnswers({})
                  }}
                    className="rounded-full border-black/10 hover:bg-black/5">Start another</Button>
                  {deploy.live && <Button onClick={() => nav("/")}
                    className="flex-1 rounded-full bg-[#171409] text-white hover:bg-black">Go to dashboard</Button>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* right: live rail — what the agent becomes */}
        <div className="space-y-4 lg:pt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/35">What you're building</p>
          {OUTPUT_CARD.map(({ icon: Icon, title, desc }) => (
            <div key={title}
              className="card-3d card-3d-hover group p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-black/[0.04] text-black/60 transition-colors group-hover:bg-[#e63e0b]/10 group-hover:text-[#e63e0b]">
                  <Icon className="size-4" />
                </span>
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-black/50">{desc}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-black/12 p-4">
            <p className="flex items-center gap-2 text-[12px] text-black/45">
              <ScrollText className="size-3.5 shrink-0 text-black/30" />
              Each decision lands in an auditable log, so you can always see why the agent acted.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
