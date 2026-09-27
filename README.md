# RIL AI Marketing Platform

Renaissance Innovation Labs' marketing operating workspace. The product links activities, audience intelligence, content, approvals, distribution, leads and campaign measurement. AI proposes; people approve.

## Local setup

```bash
cp .env.example .env
npm install
supabase db push
npm run dev
```

Configure Supabase project credentials, `CRON_SECRET`, `AI_CONFIG_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET`, and `NEXT_PUBLIC_SITE_URL` in `.env`. Keep the two encryption/token secrets stable after deployment; changing them makes saved provider credentials unreadable or previously issued unsubscribe links invalid. `supabase db push` applies all migrations, including the private activity-media bucket, brand knowledge, landing pages, campaign attribution, consent fields and email delivery tables. Do not expose service-role keys in browser code. Development seed data is in `supabase/seed_dev.sql`; never run it against production. For a full demo workspace — every surface populated across both demo organisations — run `supabase/seed_demo.sql` in the Supabase SQL editor after the migrations. It is idempotent (row ids derive from `md5(organization_id || label)`), it seeds Buffer, Resend, WordPress and Google Analytics as *connected* with fake credentials so the connector cards look live, and it deliberately leaves the AI provider unconfigured so generation uses the built-in template provider. Remove those integration rows with `DELETE FROM integrations WHERE config->>'demo' = 'true';` before the workspace goes real.

## Product surfaces

- `/dashboard` — Command Centre: tasks, KPIs, approvals, schedule, upcoming activities and lead follow-up.
- `/activities` — editable activity records, private source-file uploads, and grounded repurposing.
- `/library` — searchable drafts with channel/activity/campaign/status filters, draft editing, on-page SEO metadata and checklist, status transitions, approval history and publishing schedule.
- `/seo` — topic-grounded website draft analysis, metadata suggestions, heading outlines, published-page link opportunities, and an editorial readiness checklist that does not claim ranking outcomes.
- `/calendar` — scheduled content and audience-driven calendar proposals. Generated proposals enter the library as drafts; they are never automatically scheduled.
- `/audience/segments` and `/audience/insights` — audience personas, learning signals and human approval.
- `/audience/campaigns` — campaign objectives, audiences, funnel stage, date range, budget/currency, channel plan, lifecycle gates, and performance rollups with links to related drafts.
- `/email` — consent-filtered audience counts, campaign drafts, second-person approval, explicit recipient queueing and confirmed send batches. Delivery metrics and unsubscribe/suppression handling are tracked through signed Resend webhooks.
- `/reports` — generate persisted weekly, monthly or custom reports from workspace metrics, with evidence limits and reviewer status; owners, admins and marketing managers can optionally schedule weekly/monthly review drafts.
- `/community` — manual community-item intake, AI or rules-based classification, reply drafting, an approval gate before manual posting, and lead routing into CRM without granting email consent.
- `/settings/automation` — role-gated opt-in activity-to-campaign/content/email/landing-page draft chain with queue history and retry; no automatic sending or publishing.
- `/audience/landing-pages` — landing-page builder and two-role publication flow; `/p/[slug]` is the public capture form.
- `/leads` — CRM-lite with explainable scoring, follow-up and explicit marketing consent.
- `/assistant` — workspace-grounded marketing recommendations.
- `/trends` — manually sourced trend opportunities.
- `/settings/brand` — organization-scoped knowledge used in relevant drafts.
- `/settings/ai` — AI provider, Buffer, and WordPress publishing settings.

## Audience learning and AI

The recommendation service filters to approved audience insights at query time. Activity generation combines the activity record, segment motivations/preferences, approved insights, and relevant active brand guidance. Generated assets store their source activity and model trace and remain behind the content approval pipeline. The Assistant sends the user's question and limited aggregate workspace evidence to the configured AI provider; it does not send lead contact details. Community items are entered manually until platform comment APIs are configured; suggested replies stay internal until approved and manually posted.

AI provider keys are encrypted at rest. OpenAI-compatible, Claude, and Gemini settings live in `/settings/ai`. Without a configured model, content repurposing uses the deterministic grounded template provider; the Assistant returns a live workspace summary instead of pretending to run a model.

## External services and remaining integration work

WordPress publishing uses a dedicated Application Password over HTTPS. Configure and verify the site under `/settings/ai`; only approved blog/website content exposes the immediate publish action. The article gets an asset-specific slug so a retry can find the existing post. The password is encrypted with `AI_CONFIG_SECRET`. Google Analytics 4 and Search Console are supported in saved reports. Enable the Analytics Data API and Search Console API in Google Cloud, grant a dedicated service account read access to both properties, then save its JSON key and property identifiers in `/settings/ai`. The encrypted key requires a stable `AI_CONFIG_SECRET`; use a dedicated least-privilege account and rotate or revoke its key if exposed. Reports show GA4 users, sessions, page views and popular pages, plus Search Console clicks, impressions, top queries and average position for the available reporting window. Search Console data is delayed and does not replace rank tracking, crawl health or keyword-volume tools. Buffer publishing uses Buffer's current GraphQL API (`api.buffer.com`) over OAuth 2.0 with PKCE; register an OAuth client under Buffer's Settings → API and connect at least one channel. The legacy REST API (`api.bufferapp.com/1/`) is retired on 1 February 2027, so nothing should target it. Buffer's "profiles" are now "channels", and any service Buffer supports — including TikTok, Threads and Bluesky — can be published to, not just LinkedIn, Instagram, X and YouTube. Activity images (JPEG, PNG and WebP up to 8 MB) can be analysed with a configured vision-capable OpenAI, Claude or Gemini model; scene notes, alt text and platform-specific caption drafts are saved for human review in the Content Library. With Gemini configured, audio/video files up to 14 MB can be transcribed and summarized with approximate highlights, suggested clip ranges and three source-linked drafts; clip suggestions do not edit media. PDF, DOCX, TXT and Markdown activity documents up to 8 MB can be text-extracted and repurposed into blog, newsletter and platform-specific social drafts, also held for review. Apply the image-analysis migration before using image, audio or video analysis. `/seo` analyzes editable blog and website drafts using the configured AI model, or transparent local copy checks when no model is connected; people apply suggested metadata and edit article structure themselves. Published campaign pages appear in `/sitemap.xml`; `/robots.txt` excludes private workspace routes. SEO readiness does not measure rankings, page speed, crawl errors, backlinks or search volume. Leads also support human-led, dated follow-up tasks; apply the lead-follow-up migration to enable them. Trend monitoring supports opt-in daily ingestion from fixed TechCabal and Disrupt Africa RSS feeds, with source-linked items, optional AI editorial analysis, approval/dismissal and trend-to-content drafts; apply the trend-monitoring migration and configure `CRON_SECRET`. Email delivery uses Resend: apply the email-delivery migration, set `NEXT_PUBLIC_SITE_URL`, `AI_CONFIG_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET` and `CRON_SECRET`, then connect a verified sender and signed webhook in `/email`. Reviewers must approve, queue and explicitly confirm a batch; the cron then processes scheduled batches. Never use production recipient data for a first send. Paid-media reporting, other CMS providers and channel comment sync still require provider selection, credentials, webhook handling and operational review. Lead-capture nurture remains held until a consent-safe sequence workflow can be reviewed and configured. The opt-in activity-to-draft automation is queued through `/api/cron/marketing-automation`; scheduled work requires `CRON_SECRET` and the Supabase service-role key. Integrations are shown as connected only after their configured credentials pass verification.

## Useful commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Production deployments must apply the checked-in Supabase migrations before using new database-backed features. Scheduled reports additionally require `CRON_SECRET`, the Supabase service-role key, and the `/api/cron/scheduled-reports` Vercel cron entry. The scheduler uses UTC and saves reports as review drafts; it does not email reports.
