# voiceAgentDashboard — runbook

Control-plane console for voiceAgent. Reaches the agent **only** through its
control API; agent files are never touched. Serves two audiences: business
owners (onboard wizard) and operators (live decision/quality dashboard).

## Run (dev)

```bash
npm install
npm run dev -- --port 5174   # note: binds [::1]; open http://localhost:5174
```

## Build (prod)

```bash
npm run build      # emits dist/
```

## Connect to an agent

1. Start the agent's control server (see voiceAgent RUNBOOK §1).
2. Open the **Connection** page, enter the agent URL + control token.
3. Credentials live in this browser's `localStorage` (key `va_agent`) — no
   server, no logs, no third party.

## Routes

- `/` — Overview: live decision stream (4s poll), bento metrics, verdict mix,
  LLM-judge quality scores, caller feedback. Honest empty/error states only.
- `/onboard` — business-owner wizard: paste site/describe → compile preview →
  approve & deploy.
- `/connect` — agent URL + token.

## Design

Dark instrument panel (`#141416` sidebar + `#ff5701` accent, Inter Tight +
JetBrains Mono), motion primitives in `src/components/motion-primitives.tsx`
(SpotlightCard, AnimatedCounter, Stagger, MagneticButton), signal-network
canvas background in `src/components/soundscape.tsx`.
