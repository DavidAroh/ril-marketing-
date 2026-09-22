# RIL — Audience Intelligence & Learning Layer (v1)

Next.js 16 + React + TypeScript + Tailwind + shadcn/ui + Supabase (PostgreSQL + Auth) + Zod + React Hook Form + Recharts + Lucide.

## Principle

> AI recommends. Humans decide.

Insights are generated as `PENDING_REVIEW` and only reach the recommendation
layer after a marketing user approves them (`APPROVED`). `SUPPRESSED` insights
are never recommended. The gate is enforced in SQL (`status = 'APPROVED'` in
`getAudienceRecommendations`), not just in the UI.

## Setup

```bash
cp .env.example .env   # fill in Supabase project + CRON_SECRET
npm install
supabase db push       # applies supabase/migrations/0001_audience_intelligence.sql
npm run dev
```

Dev-only seed (never production): `supabase/seed_dev.sql`.

## Key routes

- `/dashboard` — Command Centre (stats, tasks, KPIs, pipeline, schedule, follow-ups)
- `/activities`, `/activities/new`, `/activities/[id]` — Activity Hub + repurposing trigger
- `/library`, `/library/new`, `/library/[id]` — Content Library, approval pipeline, registration links
- `/calendar` — scheduled/published month view
- `/audience/segments`, `/audience/insights`, `/audience/campaigns`
- `/leads`, `/leads/[id]` — CRM-lite with explainable scoring
- `/trends` — trend inbox (manual intake; automated monitoring is Phase 2)
- `/settings/ai` — AI provider key (OpenAI-compatible) + integration status board
- `POST /api/capture/lead` — public attributed lead capture (registration token required)
- `/settings/ai` — AI key, Buffer connector, integration status
- `GET /api/audience-insights/recommendations?segmentId=…`
- `POST /api/cron/audience-insights` (`Authorization: Bearer $CRON_SECRET`; scheduled via `vercel.json`)

## AI generation modes

Pick **OpenAI, Claude or Gemini** in Settings → AI settings, paste its API
key, pick a model from the dropdown, test, save. Endpoints, headers and
model lists live in code (`src/lib/ai/providers.ts`) — the team never touches
them. Without a key, the grounded template generator runs: drafts use only
activity facts + approved insights, interpretation is labelled suggestion, and
every draft lands as `ai_generated` pending review. The model label is stored
on each `ai_generations` row for traceability. Any provider failure falls back
to templates, never to an error screen.

## Downstream integration

```ts
import { getAudienceRecommendations } from "@/lib/audience/recommendations";
// Content Repurposing: Activity -> segment -> approved insights -> AI generation
// Content Calendar: getCalendarSignals(orgId, segmentId) -> proven topics/formats/platforms/hooks/CTAs
```

## Platform map (full PRD)

This module implements the Audience Intelligence & Learning Layer (§6.29)
plus its platform obligations: approval audit trail (`insight_approvals`,
§7 Approval), approval-tier roles (owner/admin/marketing_manager/leadership,
§11), Command-Centre tasks (§6.1, §7 Task), KPI tracking seeded from §14
targets, content-asset pipeline statuses (§11), and the registration-link
attribution seam (§6.16). Consumers: repurposing brief
(`POST /api/content-repurposing/brief`), calendar/recommendation signals
(`GET /api/audience-insights/recommendations`), lead-scoring signals
(`GET /api/lead-scoring/segment-signals`), campaign rollups
(`/audience/campaigns`).

Out of scope here (later PRD phases): asset generation/transcription
integrations, Buffer/email/ad connectors, full CRM UI, trend engine, SEO,
community inbox, assistant, RAG brand base, automation chains, predictive
models — each plugs into the entities and APIs above.

## Quality gates

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Status-code note

Detail pages (`/audience/segments/[id]`, `/audience/insights/[id]`) call
`notFound()` for missing/foreign records. Because these routes stream
(`loading.tsx`), Next.js serves the not-found UI with HTTP 200 and
auto-injects `<meta name="robots" content="noindex" />` — documented framework
behavior, not a bug. Unknown routes return a real HTTP 404.
