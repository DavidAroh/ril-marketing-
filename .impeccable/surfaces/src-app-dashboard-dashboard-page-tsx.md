---
version: 2
slug: "src-app-dashboard-dashboard-page-tsx"
primary_target: "src/app/(dashboard)/dashboard/page.tsx"
related_targets: ["src/app/(dashboard)/layout.tsx","src/components/app-sidebar.tsx","src/app/globals.css"]
---

# Surface brief — Dashboard Command Centre (dashboard + shell replacement world)

Scope: `/dashboard` page body plus the app shell it lives in (sidebar, header); other routes inherit the shell but are not redesigned in this pass. Mode: Operate.

Audience/job: marketing approver triaging PENDING_REVIEW insights into approve/annotate/suppress so only approved intelligence feeds repurposing + calendar. Action: scan needs-attention, decide, patch through. Proof/content: real counts (segments, pending, approved), open tasks, KPI progress, pipeline, scheduled next, follow-ups, learning-loop strip. Constraints: keep all product truth — routes, RLS org isolation, PENDING→APPROVED SQL gate, terminology; light ground for daylight desk scanning; keyboard-operable; reduced-motion safe; RIL brand commitments (horizontal black/white logo only, Open Sans throughout, White/Ink/Blue palette) stay binding.

Chosen direction: The Flatplan — the month as one ruled grid of content cells, each carrying its own stamped state. Memorable moment: the first decision cell flips its stamp in place while the gutter counts step.

Resolved during build: at 390px the plan flattens to a single ruled list (cells wrap action under title; the gutter stacks below the grid as a ruled block with leader lines intact). The shell masthead stays neutral — a thin ruled band with one hairline border, no grid rule language; the plan sheet carries the ruled voice.

## Direction contract
THESIS: The Command Centre is a magazine flat plan, not a KPI card wall or a stack of slips. It refuses the stat-card grid + sidebar default and its paper-slip opposite: one ruled plan sheet carries the whole month of work, cells densest where decisions live, counts printed in the gutter instead of cards.

OWN-WORLD: Bright paper ground (#FFFFFF), ink #212120, committed RIL blue #177AE5 only as whole fields (header band, selected cells, primary actions), hairline #D9E2EC rules as the only divider, red #B3261E reserved for what needs action. Open Sans throughout: 800 display, 700 heads, 400/600 body, tracked uppercase status stamps, tabular figures for every count. Cell = ruled rectangle with code, status stamp, title; no floating cards, no shadows, no radius above 4px on plan surfaces.

STORY: The approver sees what is scheduled, what is in review, what is blocked; believes nothing auto-applies because every cell wears its gate state as a word; does: stamps the review cells, reads the gutter counts, opens the plan.

FIRST VIEWPORT: Thin masthead (logo, dateline, Log activity primary). Below, the plan sheet: a ruled grid of content cells — pending insights and review assets flagged at top-left as decision cells with Review/Approve as the first action above the fold — and a right gutter printing tabular counts (awaiting, scheduled 30d, leads, assets) as ruled ledger lines with leader-line annotation, plus this week's seven-day strip along the bottom rule.

FORM: Magazine flat plan / issues grid; position 1 of my grounded list (top-ranked candidate, user-locked as pick; rolled assignment was candidate 4 Matchday Board); seed key c7fc7873.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
