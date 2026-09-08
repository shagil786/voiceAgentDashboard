import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlugZap, CheckCircle2, XCircle, TerminalSquare } from "lucide-react"
import { api, getConfig, saveConfig, type StatusInfo } from "@/lib/api"
import { useNavigate } from "react-router-dom"

export function ConnectPage() {
  const nav = useNavigate()
  const saved = getConfig()
  const [url, setUrl] = useState(saved?.url ?? "")
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Connection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the console at the agent's control API. Credentials are stored in this browser only — never shipped or logged.
        </p>
      </header>

      {err && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2"><XCircle className="size-4" /> Connection failed</AlertTitle>
          <AlertDescription>{err} — the details are saved, so you can retry or check the agent side.</AlertDescription>
        </Alert>
      )}

      {ok && (
        <Alert>
          <AlertTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Connected</AlertTitle>
          <AlertDescription>
            {ok.audit_db ? `Audit store: ${ok.audit_db}` : "Agent reachable — no audit store configured yet."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><PlugZap className="size-4 text-primary" /> Agent control API</CardTitle>
          <CardDescription>Start the agent's control server, then enter its details here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="url">Agent URL</Label>
            <Input id="url" placeholder="http://127.0.0.1:8081" value={url}
              onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Control token</Label>
            <Input id="token" type="password" placeholder="VOICEAGENT_CONTROL_TOKEN" value={token}
              onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          </div>
          <Button className="w-full" onClick={() => void connect()} disabled={busy}>
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
            {busy ? "Checking…" : "Test connection"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TerminalSquare className="size-4 text-muted-foreground" /> Run it on the agent machine</CardTitle>
          <CardDescription>In the <code className="rounded bg-muted px-1">voiceAgent</code> repo:</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{`VOICEAGENT_CONTROL_TOKEN=your-token \\
VOICEAGENT_AUDIT_DB=data/out/audit.sqlite \\
.venv/bin/python scripts/control_server.py 8081 127.0.0.1`}</pre>
          <p className="mt-3 text-xs text-muted-foreground">
            The server refuses to start without a token — fail-closed by design. Without a connection, the Overview shows an empty state (no demo data).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
