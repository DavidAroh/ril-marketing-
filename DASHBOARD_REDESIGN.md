# Dashboard redesign — September 2026

The authenticated workspace now follows the user-selected modern SaaS admin direction. This supersedes the Open Lab dashboard guidance in DESIGN.md and the prior UI_REDESIGN.md concept. Public landing and authentication pages retain their existing brand treatment.

- Neutral grey workspace, dark navigation rail, white task surfaces, blue primary actions and active navigation.
- Open Sans typography, sentence-case metadata and status labels, tabular counts, 12px cards.
- Shared shell across dashboard routes: searchable page navigation, mobile drawer, active-page semantics, skip-to-content target, account menu.
- Overview: live summary cards, approval queue, weekly publishing schedule, channel mix, scheduled content, activity and KPI progress.
- Existing Supabase access, human approval requirements, feature work and server actions remain intact.
- Counts and charts use existing queries; no invented performance comparisons or sample records were added.

Validation: TypeScript and changed-file lint; authenticated desktop and mobile browser checks. Full-project lint has unrelated existing failures (landing-pages and SEO actions, billing-health and dashboard-invoices).

Reference-led updates: removed the active navigation stripe; replaced overview cards with a continuous divided metric strip; content mix uses a monochrome donut (two largest channels plus Other); KPI progress is a normalized horizontal chart with missing measurements explicitly marked. Open Sans retained. Channel mix discloses when its data is limited to the latest 20 assets.

The second pass extends the visual system to the full authenticated route group: section-aware top bar, dark search and navigation rail, consistent page mastheads, underlined filter navigation, quieter list and form surfaces, clearer status stamps, and responsive controls. The insight review screen now uses a single ruled queue rather than separate cards. The overview metric strip and content-mix module use the darker analytics treatment while the decision queue remains light.
