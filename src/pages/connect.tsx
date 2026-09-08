import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Plug, XCircle } from "lucide-react"
import { api, getConfig, saveConfig } from "@/lib/api"
import { useNavigate } from "react-router-dom"

export function ConnectPage() {
  const nav = useNavigate()
  const saved = getConfig()
  const [url, setUrl] = useState(saved?.url ?? "")
  const [token, setToken] = useState(saved?.token ?? "")
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function connect() {
    if (!url.trim() || !token.trim()) {
      setStatus({ kind: "err", text: "Agent URL and token are both required." }); return
    }
    setBusy(true); setStatus(null)
    saveConfig({ url: url.trim(), token: token.trim() })
    try {
      const st = await api.status()
      setStatus({
        kind: "ok",
        text: st.audit_db ? `Connected — audit store: ${st.audit_db}` : "Connected — no audit store configured on the agent yet.",
      })
      setTimeout(() => nav("/"), 900)
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect to your agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the console at the agent's control API (runs on the agent machine, default{" "}
          <code className="rounded bg-muted px-1">127.0.0.1:8081</code>). Credentials stay in this browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plug className="size-4 text-primary" /> Agent connection</CardTitle>
          <CardDescription>Start the agent's control server with <code className="rounded bg-muted px-1">VOICEAGENT_CONTROL_TOKEN</code> set, then enter the details here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="url">Agent control URL</Label>
            <Input id="url" placeholder="http://127.0.0.1:8081" value={url}
              onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Control token</Label>
            <Input id="token" type="password" placeholder="VOICEAGENT_CONTROL_TOKEN" value={token}
              onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          </div>
          {status && (
            <Alert variant={status.kind === "ok" ? "default" : "destructive"}>
              {status.kind === "ok"
                ? <CheckCircle2 className="size-4 text-emerald-600" />
                : <XCircle className="size-4" />}
              <AlertTitle>{status.kind === "ok" ? "Connected" : "Connection failed"}</AlertTitle>
              <AlertDescription>{status.text}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={() => void connect()} disabled={busy}>
            {busy ? "Checking…" : "Connect"}
          </Button>
          <p className="text-xs text-muted-foreground">
            No agent running? The console still works in demo mode — every screen shows sample data until a real agent answers.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
