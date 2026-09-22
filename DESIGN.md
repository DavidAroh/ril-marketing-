---
name: RIL Audience Intelligence
description: Open Lab runs the bench in RIL blue, black ink, and Open Sans.
colors:
  white: "#ffffff"
  ink: "#212120"
  blue: "#177ae5"
  blue-deep: "#0f5ca8"
  soft: "#3e4a56"
  line: "#d9e2ec"
  tint: "#eaf2fa"
  need: "#b3261e"
typography:
  display:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.6
  title:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  small:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
  tag:
    fontFamily: "Open Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
rounded:
  tag: "9999px"
  btn: "8px"
  bed: "12px"
  close: "16px"
  focus: "3px"
spacing:
  section: "56px"
  section-lg: "80px"
  bed: "24px"
  row: "14px"
components:
  ril-btn-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.btn}"
    padding: "10px 16px"
  ril-btn-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.btn}"
    padding: "10px 16px"
  ril-btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.btn}"
    padding: "10px 16px"
  ril-btn-paper:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.btn}"
    padding: "10px 16px"
  ril-tag:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "3px 10px"
---

# Design System: RIL Audience Intelligence

## Overview

**Creative North Star: "Open Lab"**

The bench is a white lab table, not a claim wall. Pending work waits in a review queue, the owner clears the approved forward, and the suppressed is set aside where it can never be recommended. One committed blue carries whole regions — rails, close field, primary actions — while black ink carries structure and tint tags stamp every state as a word first.

The dashboard Operate surfaces inherit the same tokens through `src/app/globals.css` and the shared `ui/` components (paper slips on white ground, ink structure, blue decision marks, Open Sans stamps). The sign-in screen carries the one signature illustration: three Renaissance columns rendered as a stippled point cloud, white dots on the RIL blue brand panel. Landing and app share product truth, routes, and terminology.

**Key Characteristics:**
- Committed blue owns regions (rail, close, primary action), never scattered accents.
- Word-first stamps (Pending Review, Approved, Suppressed); single red reserved for failed/needs-action only.
- Paper slips on white ground, hairline blue-tinted borders, quiet offset shadows.
- Stippled column art as the single signature illustration, on auth only.

## Colors

Committed blue on white, black ink for structure, one red reserved for what needs action.

### Primary
- **Blue** (#177ae5, RIL brand-kit blue): rails, primary buttons, the active mark, links, focus rings. The decision and brand color.
- **Ink** (#212120): headings, body, structure.

### Neutral
- **White** (#ffffff): app and card ground.
- **Tint** (#eaf2fa): tags, wells, hover fills, progress tracks.
- **Line** (#d9e2ec): hairline borders and ledger dividers.
- **Soft** (#3e4a56): secondary text and metadata.

### Reserved
- **Need** (#b3261e): failed / needs-action only. Never decorative.

### Named Rules
**The Stamp Before Color Rule.** Every status ships as an uppercase word (Pending, Approved, Suppressed); tint or blue backs the word, never replaces it.
**The Committed Blue Rule.** Blue owns whole regions (rail, close field, primary action), not scattered accents. Red is reserved for what needs action.

## Typography

**Display / Body Font:** Open Sans (`--font-ril-sans`), weight steps 400–800. Open Sans throughout, per the RIL brand kit — no second display face.
**Label / Mono Font:** ui-monospace for counts, codes, and dates only.

**Character:** A single workhorse sans carries headings and body with weight steps; mono carries measurement and appears in the uppercase `.dateline` for wire numbers, dates, and codes. No display serif.

### Hierarchy
- **Display** (800, clamp 2.5–4rem, -0.02em): landing hero.
- **Headline** (700, -0.02em): page and slip titles. Headings speak first; no kickers.
- **Body** (400, 0.875rem, 1.6 line height, 65–75ch max): descriptions, list copy.
- **Dateline / Tag** (700, 0.6875rem, 0.08em, uppercase): datelines, wire numbers, table heads, stamps.

### Named Rules
**The No Kicker Rule.** No eyebrow label above a heading.
**The Mono Measures Rule.** Monospace is for code, data, and measurement only.

## Layout

A calm bench, not a stat-card wall. Left rail: brand block → search (filters the nav) → grouped navigation (Essentials / Intelligence / Workspace) → operating-principle footer. Content maxes at ~7xl; sections separate generously while entries inside a slip group tightly under hairline dividers. Sidebar collapses to a horizontal scroll rail under the medium breakpoint. Spacing rhythm uses 12/16/24px steps, more space above a heading than below it.

## Elevation & Depth

Quiet depth. Slips lift off the white ground with a soft two-layer offset shadow; rails and chrome stay flat. Buttons press with a scale response (0.96), not a lift.

### Named Rules
**The Quiet-Shadow Rule.** Shadows are barely-there and identical everywhere. No zero-offset halos, no hard offset block shadows.

## Shapes

Soft, modern, ruled: tags at pill radius, buttons 8px, cards/beds 10–12px, close field 16px. Borders are 1px hairlines in Line. No gradient text, no glass.

## Components

### Buttons
- **Primary (blue):** RIL blue fill, white text; press scales to 0.96.
- **Ink / Ghost / Paper:** ink fill, transparent, or white-on-blue for the close field.
- **Focus:** 2px blue ring with 2px offset everywhere.

### Chips / Stamps
- Tint-backed pill or squared stamp: mono uppercase 11px text; pending/review in blue, approved in emerald, failed/need in red, neutral in tint/soft. Text-first.

### Cards / Containers (`.slip`)
- 10–12px corners, white surface on white ground, 1px line border, quiet offset shadow.
- Entries inside divide with `.ledger` hairlines; internal padding 16–20px.

### Inputs / Fields
- White ground, line border, rounded corners; 2px blue focus ring. Error keeps the ring in red with a named recovery message.

### Navigation
- App shell (dashboard): `@efferd/dashboard-5` block primitives — `AppShell`, sidebar, header, cards, share-bar lists — restyled to RIL tokens. Sidebar carries the RIL black logo, real user menu, and links only to real routes plus Command Centre queue anchors. The block's demo analytics widgets (visitors, top pages, web vitals) are not used; the Command Centre shows live workspace counts instead.
- Left rail: brand mark + product name; search input filters nav labels live; items grouped under mono group labels. The active item fills tint/secondary and carries a blue dot (plus aria-current). Mobile collapses to a horizontal scroll rail. Footer carries the standing rule — AI recommends, humans decide.

### Auth
- Split console: minimal form (ringed monogram, title, email/password with inline icons, blue Login button, sign-up link) on the left; the stippled Renaissance columns in white dots on the RIL blue brand panel at right. No frame or divider borders. The single signature illustration in the system.

### Decision Card
- Signature pattern: mono item number, medium title, single decisive action (Review on the first wire, outline after). New items enter with one authored rise-and-fade stagger; the rest of the page is still.

## Do's and Don'ts

### Do:
- **Do** stamp every state as a word first with tabular counts beside it.
- **Do** let committed blue own whole regions; keep structure in ink.
- **Do** number sequences that carry process (Wire 01, Insight 01/12).
- **Do** reserve red for what needs action only.

### Don't:
- **Don't** rebuild the uniform icon-plus-heading stat-card grid; the ledger owns summary data.
- **Don't** scatter blue as an accent, use kickers above headings, gradient text, glass, or hard offset shadows.
- **Don't** set body copy or headings in monospace.
- **Don't** invent testimonials, customers, benchmarks, or pricing; author demonstration data at full fidelity and label it synthetic.
