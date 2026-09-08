# VoiceAgent Dashboard

The **control-plane console** for [voiceAgent](https://github.com/shagil786/voiceAgent) — a
separate repo that talks to the agent **only through its control API** (never files).

Two audiences, one app:
- **Business owners (the common case)** — onboarding wizard: paste your website /
  describe your business → review what the agent learned → approve → test it.
- **Developers / operators** — dashboard: calls taken, verdicts, ratings,
  escalation rate, latency — live from the agent's stores.

## Architecture

```
voiceAgent (agent repo)              voiceAgentDashboard (this repo)
  governed runtime                    ┌──────────────────────────────┐
  deploy pipeline                     │  Onboarding wizard           │
  control API (port 8081,            │  Dashboard (calls/ratings/…)  │
    bearer token) ────HTTP/JSON────►  │  Connect-to-agent config     │
  audit + ratings + metrics          └──────────────────────────────┘
```

The agent's control surface (live, in `voiceAgent` since `6bd6ba5`):
`GET /api/control/{status,calls,ratings,summary}`,
`POST /api/control/onboard/{preview,deploy}`.

## Quickstart

1. Start the agent's control API:
   ```bash
   cd ../voiceAgent
   VOICEAGENT_CONTROL_TOKEN=<token> \
   VOICEAGENT_AUDIT_DB=data/out/audit.sqlite \
   VOICEAGENT_MEMORY_DB=data/out/intent_memory.db \
   .venv/bin/python scripts/control_server.py 8081 127.0.0.1
   ```
2. Serve this app (any static server):
   ```bash
   python3 -m http.server 5173 --directory app
   ```
3. Open http://127.0.0.1:5173 — first screen asks for the agent URL + token
   (stored in the browser only; never shipped).

## Layout

| Path | Purpose |
|---|---|
| `app/index.html` | Landing/connect: enter agent URL + token |
| `app/dashboard.html` | KPIs + calls table + verdicts/ratings from the control API |
| `app/onboard.html` | Wizard: paste site/business → preview bundle → approve/deploy |
| `docs/` | API contract notes, decisions |

## Status

Phase 1 prototype. The dashboard is wired to real control-API endpoints where
the agent is reachable; a "demo mode" fills with sample data when no agent is
configured, so the UI is reviewable standalone.
