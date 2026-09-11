// Control-API client for the VoiceAgent console.
// Talks to the agent's control server (voiceAgent repo) over HTTP with a
// bearer token. Credentials are kept in localStorage (browser only).

export interface AgentConfig { url: string; token: string }

const KEY = "va_agent"

export function getConfig(): AgentConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AgentConfig) : null
  } catch {
    return null
  }
}

export function saveConfig(cfg: AgentConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearConfig(): void {
  localStorage.removeItem(KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getConfig()
  if (!cfg) throw new ApiError(0, "Not connected — set your agent URL and token first.")
  const res = await fetch(cfg.url.replace(/\/$/, "") + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export interface Summary {
  calls: number
  conversations: number
  verdicts: Record<string, number>
  escalation_rate: number | null
  ratings: number
  avg_rating_10: number | null
}

export interface CallRow {
  ts: string; conv_id: string; action: string; verdict: string;
  reasons: string[]; amount?: number | null; authenticated?: boolean
}

export interface RatingRow {
  tenant: string; session_id: string; ts: string; rating: number; comment: string
}

export interface StatusInfo {
  ok: boolean; audit_db?: string | null; memory_db?: string | null; deploy_root?: string | null
}

export interface ConvScore {
  source: string; overall: number | null; tool_choice: number | null;
  verdict_quality: number | null; escalation_judgment: number | null;
  reasoning: string; conv_id?: string
}
export const api = {
  scores: () => request<{ scores: ConvScore[] }>("/api/control/scores"),
  status: () => request<StatusInfo>("/api/control/status"),
  summary: () => request<Summary>("/api/control/summary"),
  calls: (limit = 100) => request<{ calls: CallRow[] }>(`/api/control/calls?limit=${limit}`),
  ratings: (limit = 100) => request<{ ratings: RatingRow[] }>(`/api/control/ratings?limit=${limit}`),
  onboardPreview: (body: unknown) =>
    request<{ tools: unknown[]; knowledge: unknown[]; policies: unknown; evals: unknown[]; note?: string }>(
      "/api/control/onboard/preview", { method: "POST", body: JSON.stringify(body) }),
  onboardDeploy: (body: unknown) =>
    request<{ checks: { name: string; passed: boolean; detail?: string }[]; live: boolean; summary: string }>(
      "/api/control/onboard/deploy", { method: "POST", body: JSON.stringify(body) }),
}
