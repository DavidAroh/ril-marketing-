---
version: 1
slug: "src-app-dashboard-dashboard-page-tsx"
primary_target: "src/app/(dashboard)/dashboard/page.tsx"
related_targets: ["src/app/(dashboard)/layout.tsx","src/app/globals.css"]
---

# Surface brief — Dashboard Command Centre (flagship of whole-app replacement world)

Scope: whole-app visual world replacement; this brief governs the flagship first surface `/dashboard` (Command Centre). Mode: Operate.

Audience/job: marketing approver triaging PENDING_REVIEW insights into approve/annotate/suppress so only approved intelligence feeds repurposing + calendar. Action: scan needs-attention, decide, patch through. Proof/content: real counts (segments, pending, approved), open tasks, KPI progress, pipeline, scheduled next, follow-ups, learning-loop strip. Constraints: keep all product truth — routes, RLS org isolation, PENDING→APPROVED SQL gate, terminology; light ground for daylight desk scanning; keyboard-operable; reduced-motion safe.

Chosen direction: Wire-desk operations (newsroom assignment desk). Memorable moment: the morning slate — pending findings arrive as wire slips on the assignment desk, stamped and spiked or patched through to content.

Unresolved: none blocking build; asset copy uses existing product facts, synthetic demo data labelled where needed.

## Direction contract

THESIS: The Command Centre is a morning assignment desk, not a KPI card wall. It refuses the stat-card grid + sidebar default: one ruled slate carries the day's wires, stamps, and assignments in reading order, densest where decisions live, quiet where monitoring lives.

OWN-WORLD: Bright paper ground, ink-black text, hairline rules, small red assignment tabs and stamp chips for state. Modules are ruled slips with kicker + rule + body, never floating cards. Status is a stamped chip (PENDING / APPROVED / SUPPRESSED / SCHEDULED), always text, never color alone. Counts are tabular; codes and timestamps are ui-monospace.

STORY: The approver understands what arrived overnight, what needs a decision, and what moves next. They believe nothing auto-applies because every wire shows its gate state. They do: stamp the pending, assign the approved to brief/calendar, clear the slate.

FIRST VIEWPORT: Masthead strip (product name, date line, org state) at top; below, a two-column slate — left: needs-attention wire stack with stamp actions (primary Review/Approve in reading order); right: slim assignment rail (KPI progress, pipeline counts, scheduled next). Learning-loop strip runs as a footer rule, not a card. Primary action sits on the first pending wire, above the fold.

FORM: Newsroom assignment desk / wire-desk operations; position 1 of 7 grounded candidates; seed key 63c53366 (resolved kind: pick; rolled assignment was candidate 6 patch-bay, user locked the pick).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
