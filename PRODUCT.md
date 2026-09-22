# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: marketing manager / marketing approver inside a client organization. Daily situation: triages AI-generated audience findings, decides approve / annotate / suppress, and feeds only approved intelligence into content repurposing and calendar. Success is faster confident triage with zero auto-applied insights.

Other audiences (secondary, confirmed by roles/routes): owner/admin managing workspace and approval-tier roles; leadership scanning KPIs and campaign rollups.

## Product Purpose

Renaissance Innovation Labs — Audience Intelligence & Learning Layer. Aggregates audience data, behavior analysis, content assets, and leads per segment; detects patterns deterministically; lands insights as PENDING_REVIEW; only APPROVED insights feed recommendations. Success means each pass through the content pipeline gets smarter while humans keep the final decision.

## Positioning

AI recommends. Humans decide. The approval gate is enforced in SQL (`status = 'APPROVED'` in `getAudienceRecommendations`), not just UI. SUPPRESSED insights are never recommended. Grounded generation uses only activity facts + approved insights, labelled as suggestion, with model label stored for traceability.

## Operating Context

Marketing operating ritual: Audience Data → Behaviour Analysis → Audience Insight → Content Recommendation → Distribution → Engagement → Conversion → Performance Data → New Learning. Workflows: Command Centre review (tasks, KPIs, pipeline, schedule, follow-ups); segment management; insight review pipeline; activity → repurposing brief; content library approval pipeline with registration-link attribution; scheduled/published calendar; CRM-lite lead follow-up with explainable scoring; manual trend intake (automated monitoring is Phase 2); AI provider key management.

## Capabilities and Constraints

Confirmed functionality/routes: `/dashboard` Command Centre; `/activities`, `/library`, `/calendar`, `/audience/segments`, `/audience/insights`, `/audience/campaigns`, `/leads`, `/trends`, `/settings/ai`, `/onboarding`, auth (`/sign-in`, `/sign-up`); APIs for lead capture, recommendations, repurposing brief, cron insights, lead-scoring signals, registration links.

Technical constraints: Next.js 16 + React + TypeScript + Tailwind + shadcn/ui + Supabase (PostgreSQL + Auth + RLS org isolation) + Zod + React Hook Form + Recharts + Lucide. Organization-isolated via RLS; detail pages use `notFound()` for missing/foreign records. Degraded dashboard over missing data, never a crash.

Terminology preserved: segments, insights (PENDING_REVIEW / APPROVED / SUPPRESSED), campaigns, activities, content assets (review/approved/scheduled/published), leads, trends, KPIs, tasks.

Explicitly undecided: none for this redesign — scope is visual world replacement only.

## Brand Commitments

Name: RIL Audience Intelligence / Renaissance Innovation Labs (Port Harcourt, Nigeria — renaissancelabs.org). Principle voice: optimistic, witty, confident, clear — short (KISS), no jargon, classy not stuffy, bold not brash, end on a high note. Visual identity bound by RIL Media Kit: horizontal logo (icon + Open Sans all-caps logotype, tracking 240) in black (#212120) or white (#FFFFFF) only — no gradients, effects, rotation, containing shapes, or stacked versions; palette White #FFFFFF / Black #212120 / RIL Blue #1268C5 (sampled from renaissancelabs.org alongside #212120), secondary Renaissance colors for sub-brands only; type Open Sans throughout (headline/subheadline/body, mixed case, white on blue/black); shapes Momentum / Community / Flow / Excellence / Productivity as outline + semi-transparent fill patterns; flat/doodle + 3D illustration stance. No invented claims allowed.

## Evidence on Hand

Real implementation in `src/app/(dashboard)/` with Command Centre stats, tasks, KPIs, pipeline, schedule, follow-ups; audience CRUD and approval flows; library and calendar; leads CRM-lite; trends inbox; settings/ai integration board. No real testimonials, customers, benchmarks, or pricing on hand — future work must not fabricate them. Demonstration data may be authored at full fidelity and labelled synthetic; commercial/factual claims stay uninventable.

## Product Principles

1. Human gate before intelligence spreads — nothing auto-applies.
2. Provenance over polish — every recommendation traces to approved insight + activity fact.
3. Operate at a glance, decide with evidence — scanability beats expression.
4. Degrade gracefully, never crash on missing org/data/env.
5. Learning compounds — each content pass feeds the next segment signal.
