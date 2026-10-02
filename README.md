# Northline — Full-Stack Shop (work in progress)

> **Status: partial build.** The full README (setup guides for Supabase, Google OAuth and Mailgun, architecture
> diagram, troubleshooting) is step 12 of the plan and is **not written yet**.
> **Read [`AGENT.md`](./AGENT.md) first**: it holds the plan, architecture decisions, change log and
> per-step implementation status.

## Quick start (no accounts needed)

```bash
npm install
cp .env.example .env.local
# In .env.local set:  INTEGRATIONS_DRIVER=memory
npm run dev
```

`memory` uses in-process fake auth and data for exploring the UI. It is blocked in production builds.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## What exists so far

Plan (steps 1–3 done, 4–5 implemented, 6–13 pending). See the status table in `AGENT.md`.
