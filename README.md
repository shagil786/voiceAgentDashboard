# VoiceAgent Dashboard

The **control-plane console** for [voiceAgent](https://github.com/shagil786/voiceAgent) — a
separate repo that talks to the agent **only through its control API** (never files).

Two audiences, one app:
- **Business owners (the common case)** — onboarding wizard: paste your website /
  describe your business → review what the agent learned → approve → go live.
- **Developers / operators** — dashboard: calls handled, verdicts, ratings,
  escalation rate — read from the agent's decision log and ratings store.

Built with **Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui** (radix-nova),
**recharts**-ready, lucide icons. No backend of its own.

## Architecture

```
voiceAgent (agent repo)                voiceAgentDashboard (this repo)
  governed runtime                      ┌───────────────────────────────┐
  deploy pipeline                       │ Overview — KPIs, decisions,   │
  control API :8081 (bearer token) ───► │   ratings, feedback           │
  audit + ratings + metrics             │ New agent — 3-step wizard:    │
                                        │   feed → review → approve →   │
                                        │   self-checks → live          │
                                        │ Connection — agent URL+token  │
                                        └───────────────────────────────┘
```

The agent's control surface (live in `voiceAgent` since `6bd6ba5`):
`GET /api/control/{status,calls,ratings,summary}` ·
`POST /api/control/onboard/{preview,deploy}` — bearer-token, fail-closed.

## Quickstart

1. Start the agent's control API (in `../voiceAgent`):
   ```bash
   VOICEAGENT_CONTROL_TOKEN=<your-token> \
   VOICEAGENT_AUDIT_DB=data/out/audit.sqlite \
   VOICEAGENT_MEMORY_DB=data/out/intent_memory.db \
   .venv/bin/python scripts/control_server.py 8081 127.0.0.1
   ```
2. Run this console:
   ```bash
   npm install
   npm run dev          # → http://localhost:5173
   ```
3. Open the app → **Connection** → enter the agent URL + token. Without a
   connection the app runs in **demo mode** so every screen stays reviewable.

## Screens

| Route | Purpose |
|---|---|
| `/` Overview | KPI cards (calls, avg rating, escalation, allow rate), recent-decisions table, verdict mix, caller feedback |
| `/onboard` | 3-step wizard: feed (URL or text + interview) → review the compiled proposal → approve & deploy (self-check gated) |
| `/connect` | Agent URL + token; stored in the browser only |

## Status

Phase 1. Demo-mode fallback keeps every screen reviewable without a running
agent. Deferred until real deployments: LLM-judge quality scores, live-call
streaming, managed phone numbers.
