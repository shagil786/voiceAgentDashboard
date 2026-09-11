import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlugZap, CheckCircle2, XCircle, TerminalSquare, LockKeyhole, Radio } from "lucide-react"
import { api, getConfig, saveConfig, type StatusInfo } from "@/lib/api"
import { MagneticButton, Stagger, StaggerItem } from "@/components/motion-primitives"
import { useNavigate } from "react-router-dom"

export function ConnectPage() {
  const nav = useNavigate()
  const saved = getConfig()
  const [url, setUrl] = useState(saved?.url ?? "http://127.0.0.1:8081")
  const [token, setToken] = useState(saved?.token ?? "")
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<StatusInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function connect() {
    setErr(null); setOk(null)
    if (!url.trim() || !token.trim()) { setErr("Agent URL and token are both required."); return }
    setBusy(true)
    saveConfig({ url: url.trim(), token: token.trim() })
    try {
      const st = await api.status()
      setOk(st)
      setTimeout(() => nav("/"), 900)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const facts = [
    { icon: LockKeyhole, title: "Fail-closed by design", desc: "No token, no server: the control plane refuses to start without one, and each request must carry it." },
    { icon: Radio, title: "Local by default", desc: "The agent's control API binds to 127.0.0.1 — nothing listens on the public interface." },
    { icon: TerminalSquare, title: "Nothing ships to the console", desc: "Your URL + token live in this browser's localStorage. No server, no logs, no third party." },
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* left column */}
      <Stagger className="space-y-6" delay={0.05}>
        <StaggerItem>
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e63e0b]">Connection</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Link the console to your <em className="font-serif font-normal italic text-[#e63e0b]">agent</em>.</h1>
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-black/55">
            One URL and one token — the console then reads your agent's live decision log
            and drives its onboarding compiler.
          </p>
        </header>
        </StaggerItem>

        {err && (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center gap-2 text-sm"><XCircle className="size-4" /> Connection failed</AlertTitle>
            <AlertDescription className="text-[13px]">{err} — details are saved, so you can retry or check the agent side.</AlertDescription>
          </Alert>
        )}
        {ok && (
          <Alert className="border-emerald-500/30 bg-emerald-500/[0.05]">
            <AlertTitle className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Connected</AlertTitle>
            <AlertDescription className="text-[13px] text-black/55">
              {ok.audit_db ? `Audit store: ${ok.audit_db}` : "Agent reachable — no audit store configured yet."}
            </AlertDescription>
          </Alert>
        )}

        <Card className="card-3d">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base"><PlugZap className="size-4 text-[#e63e0b]" /> Agent control API</CardTitle>
            <CardDescription className="text-[13px] text-black/50">Start the control server on the agent machine, then enter its details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="url" className="text-[13px] font-medium text-black/70">Agent URL</Label>
              <Input id="url" placeholder="http://127.0.0.1:8081" value={url}
                onChange={(e) => setUrl(e.target.value)} autoComplete="off"
                className="h-11 rounded-xl border-black/10 bg-white font-mono shadow-none focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-[13px] font-medium text-black/70">Control token</Label>
              <Input id="token" type="password" placeholder="VOICEAGENT_CONTROL_TOKEN" value={token}
                onChange={(e) => setToken(e.target.value)} autoComplete="off"
                className="h-11 rounded-xl border-black/10 bg-white font-mono shadow-none focus-visible:border-[#e63e0b] focus-visible:ring-[#e63e0b]/20" />
            </div>
            <MagneticButton strength={0.12} className="w-full">
              <Button className="h-11 w-full rounded-full bg-[#171409] text-white shadow-[0_8px_30px_-12px_rgba(23,20,9,0.5)] transition-all hover:bg-black hover:shadow-[0_14px_40px_-12px_rgba(23,20,9,0.6)]" onClick={() => void connect()} disabled={busy}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                {busy ? "Checking…" : "Test connection"}
              </Button>
            </MagneticButton>
          </CardContent>
        </Card>
      </Stagger>

      {/* right rail */}
      <Stagger className="space-y-4 lg:pt-16" delay={0.15}>
        <StaggerItem>
        <div className="rounded-2xl bg-[#171409] p-5 text-white shadow-[0_20px_50px_-28px_rgba(0,0,0,0.5)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Run on the agent machine</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">In the <code className="rounded bg-white/10 px-1 font-mono text-[12px] text-white">voiceAgent</code> repo:</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">{`VOICEAGENT_CONTROL_TOKEN=secret \\
VOICEAGENT_AUDIT_DB=data/out/audit.sqlite \\
.venv/bin/python scripts/control_server.py \\\\
  8081 127.0.0.1`}</pre>
        </div>
        </StaggerItem>
        {facts.map(({ icon: Icon, title, desc }) => (
          <StaggerItem key={title}>
          <div className="card-3d card-3d-hover group flex gap-3 p-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-black/60 transition-colors group-hover:bg-[#e63e0b]/10 group-hover:text-[#e63e0b]">
              <Icon className="size-3.5" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-black/50">{desc}</p>
            </div>
          </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
