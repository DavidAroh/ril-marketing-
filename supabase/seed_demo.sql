-- ============================================================================
-- DEMO SEED — synthetic data for exploring the platform. NEVER run in production.
--
-- Run against a database that already has every migration applied:
--   supabase db query --linked -f supabase/seed_demo.sql
--   (or paste into the Supabase SQL editor)
--
-- What this does
--   * Seeds BOTH existing organizations so whichever account you sign in with
--     shows a populated workspace:
--       5bb06ed8-c911-49af-9bc9-3709664ca147  Renaissance Innovation Labs
--       fb75265e-4de7-4293-b405-94b408875aea  Demo Lab
--   * Covers activities, source materials, segments, insights, assets, the
--     approval pipeline, publications, registration links, leads, follow-ups,
--     KPIs, tasks, trends, brand knowledge, landing pages, email, community,
--     reports and the automation queue.
--
-- Idempotent: every row gets a deterministic id derived from a tag, so
-- re-running is a no-op rather than a duplicate.
--
-- DELIBERATELY NOT SEEDED
--   * The `ai` integration. An invalid AI key makes every generation call fail,
--     whereas leaving it unset uses the built-in grounded template provider —
--     which actually produces real drafts. Template mode is the better demo.
--   * `activity_attachments` + media analyses: those rows need matching objects
--     in the `ril-activity-media` storage bucket, which SQL cannot create.
--
-- FABRICATED CONNECTIONS (they look connected but have no working credentials)
--   Buffer, WordPress, Google Analytics and Resend are inserted as `connected`
--   so the connector cards render. Any real call through them will fail. This
--   intentionally breaks the "never show connected until verified" rule for the
--   sake of the demo — do not carry these rows into a real environment.
--   To remove them:
--     DELETE FROM integrations
--      WHERE organization_id IN ('5bb06ed8-c911-49af-9bc9-3709664ca147',
--                                'fb75265e-4de7-4293-b405-94b408875aea');
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.demo_id(tag text) RETURNS uuid AS $$
  SELECT (
    substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-4' ||
    substr(h, 14, 3) || '-8' || substr(h, 18, 3) || '-' || substr(h, 21, 12)
  )::uuid
  FROM (SELECT md5(tag) AS h) s;
$$ LANGUAGE sql IMMUTABLE;

DO $$
DECLARE
  orgs   uuid[] := ARRAY[
    '5bb06ed8-c911-49af-9bc9-3709664ca147'::uuid,
    'fb75265e-4de7-4293-b405-94b408875aea'::uuid
  ];
  owners uuid[] := ARRAY[
    'd6e60d7c-d76e-45d1-adef-db2e02ec3bba'::uuid,
    '205f0026-20f6-458f-970f-5da516058e9e'::uuid
  ];
  i int;
  org uuid;
  actor uuid;
  seg_founders uuid; seg_students uuid; seg_sme uuid; seg_tech uuid;
  prog_bootcamp uuid; prog_accel uuid; prog_sme uuid;
  camp_bootcamp uuid; camp_fundraising uuid; camp_campus uuid;
  act_bootcamp uuid; act_masterclass uuid; act_webinar uuid;
  act_challenge uuid; act_partnership uuid; act_ailab uuid;
  asset_blog uuid; asset_newsletter uuid; asset_li uuid; asset_ig uuid;
  asset_x uuid; asset_yt uuid; asset_short uuid; asset_high uuid;
  gen_bootcamp uuid; gen_partnership uuid;
  run_insights uuid;
  ins_topic uuid; ins_format uuid; ins_platform uuid; ins_hook uuid;
  ins_pending1 uuid; ins_pending2 uuid; ins_suppressed uuid;
  lp_bootcamp uuid; lp_webinar uuid;
  mail_recap uuid; mail_invite uuid; mail_draft uuid;
  lead_hot uuid; lead_unsub uuid;
  report_monthly uuid;
BEGIN
  FOR i IN 1..array_length(orgs, 1) LOOP
    org := orgs[i];
    actor := owners[i];

    -- ── Audience segments ──────────────────────────────────────────────────
    seg_founders   := pg_temp.demo_id('seg:founders:'   || org);
    seg_students   := pg_temp.demo_id('seg:students:'   || org);
    seg_sme        := pg_temp.demo_id('seg:sme:'        || org);
    seg_tech       := pg_temp.demo_id('seg:tech:'       || org);

    INSERT INTO audience_segments
      (id, organization_id, name, description, needs_motivations,
       preferred_formats, preferred_platforms, preferred_hooks, created_by)
    VALUES
      (seg_founders, org, 'Early-stage Founders',
       'Pre-seed and seed founders raising a first round in the Niger Delta.',
       ARRAY['Raise first capital','Find first customers','Tell a fundable story'],
       ARRAY['short-form video','carousel','case study'],
       ARRAY['linkedin','x'], ARRAY['Founder story','Myth-busting stat'], actor),
      (seg_students, org, 'University Students',
       'Undergraduates and recent graduates exploring startups.',
       ARRAY['Learn startup basics','Find internships','Build a portfolio'],
       ARRAY['short-form video','meme','behind the scenes'],
       ARRAY['instagram','tiktok'], ARRAY['Day in the life','Behind the scenes'], actor),
      (seg_sme, org, 'SME Owners',
       'Owner-managers of small businesses digitising sales and marketing.',
       ARRAY['Get more leads','Systemise marketing','Prove return on spend'],
       ARRAY['case study','webinar','how-to'],
       ARRAY['linkedin','facebook'], ARRAY['Before and after','Customer proof'], actor),
      (seg_tech, org, 'Tech Entrepreneurs',
       'Technical founders scaling product, team and infrastructure.',
       ARRAY['Hire engineers','Scale infrastructure','Ship faster'],
       ARRAY['technical deep dive','newsletter'],
       ARRAY['linkedin','youtube'], ARRAY['Architecture breakdown','Benchmarks'], actor)
    ON CONFLICT (id) DO NOTHING;

    -- ── Programs ───────────────────────────────────────────────────────────
    prog_bootcamp := pg_temp.demo_id('prog:bootcamp:' || org);
    prog_accel    := pg_temp.demo_id('prog:accel:'    || org);
    prog_sme      := pg_temp.demo_id('prog:sme:'      || org);

    INSERT INTO programs (id, organization_id, name, slug, description)
    VALUES
      (prog_bootcamp, org, 'Innovation Bootcamp', 'innovation-bootcamp',
       'Three-day intensive turning early ideas into fundable ventures.'),
      (prog_accel, org, 'Founder Accelerator', 'founder-accelerator',
       'Twelve-week support programme for pre-seed teams.'),
      (prog_sme, org, 'SME Growth Lab', 'sme-growth-lab',
       'Practical growth systems for established small businesses.')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO audience_segment_programs (audience_segment_id, program_id)
    VALUES
      (seg_founders, prog_bootcamp), (seg_founders, prog_accel),
      (seg_students, prog_bootcamp), (seg_sme, prog_sme), (seg_tech, prog_accel)
    ON CONFLICT DO NOTHING;

    -- ── Campaigns ──────────────────────────────────────────────────────────
    camp_bootcamp    := pg_temp.demo_id('camp:bootcamp:'    || org);
    camp_fundraising := pg_temp.demo_id('camp:fundraising:' || org);
    camp_campus      := pg_temp.demo_id('camp:campus:'      || org);

    INSERT INTO campaigns
      (id, organization_id, audience_segment_id, name, status, starts_on, ends_on,
       objective, target_audience, funnel_stage, budget, budget_currency, channels, created_by)
    VALUES
      (camp_bootcamp, org, seg_founders, 'Innovation Bootcamp Cohort 4', 'active',
       CURRENT_DATE - 24, CURRENT_DATE + 18,
       'Fill 30 seats for the next bootcamp cohort',
       'Pre-seed founders across Port Harcourt and Lagos', 'lead_capture',
       450000, 'NGN', ARRAY['linkedin','instagram','email'], actor),
      (camp_fundraising, org, seg_founders, 'Founder Fundraising Series', 'active',
       CURRENT_DATE - 45, CURRENT_DATE + 5,
       'Build authority on fundraising and grow the qualified lead pool',
       'Founders preparing to raise', 'nurturing',
       250000, 'NGN', ARRAY['linkedin','youtube'], actor),
      (camp_campus, org, seg_students, 'Campus Innovation Challenge', 'draft',
       CURRENT_DATE + 10, CURRENT_DATE + 70,
       'Launch a campus-wide challenge and build the student list',
       'Final-year students in Rivers State', 'awareness',
       120000, 'NGN', ARRAY['instagram','tiktok'], actor)
    ON CONFLICT (id) DO NOTHING;

    -- ── Activities ─────────────────────────────────────────────────────────
    act_bootcamp    := pg_temp.demo_id('act:bootcamp:'    || org);
    act_masterclass := pg_temp.demo_id('act:masterclass:' || org);
    act_webinar     := pg_temp.demo_id('act:webinar:'     || org);
    act_challenge   := pg_temp.demo_id('act:challenge:'   || org);
    act_partnership := pg_temp.demo_id('act:partnership:' || org);
    act_ailab       := pg_temp.demo_id('act:ailab:'       || org);

    INSERT INTO activities
      (id, organization_id, audience_segment_id, campaign_id, title, source_type,
       event_date, description, speakers, partners, outcomes, registration_url, created_by)
    VALUES
      (act_bootcamp, org, seg_founders, camp_bootcamp,
       'Innovation Bootcamp — Cohort 4', 'manual', CURRENT_DATE - 21,
       'Three-day intensive for 24 early-stage founders covering customer discovery, unit economics and pitching.',
       ARRAY['Dr. Ngozi Okafor','Emeka Nwosu','Fatima Bello'],
       ARRAY['Tech Hub Lagos','Rivers State ICT Agency'],
       ARRAY['24 founders completed all three days','9 teams formed','4 pilot partnerships signed'],
       'https://renaissance-labs.example/bootcamp', actor),
      (act_masterclass, org, seg_founders, camp_fundraising,
       'Fundraising Masterclass with Sahel Capital', 'manual', CURRENT_DATE - 12,
       'Evening session on term sheets, dilution and what Nigerian VCs actually look for.',
       ARRAY['Tunde Adeyemi'], ARRAY['Sahel Capital'],
       ARRAY['61 attendees','18 follow-up applications'], NULL, actor),
      (act_webinar, org, seg_sme, NULL,
       'SME Digital Growth Webinar', 'manual', CURRENT_DATE - 8,
       'Online session on turning WhatsApp enquiries into tracked, repeatable sales.',
       ARRAY['Chioma Eze'], ARRAY[]::text[],
       ARRAY['142 registrations','89 attendees'], 'https://renaissance-labs.example/sme-webinar', actor),
      (act_challenge, org, seg_students, camp_campus,
       'Campus Innovation Challenge — Launch', 'manual', CURRENT_DATE + 10,
       'Launch event for the inter-university challenge, hosted at UNIPORT.',
       ARRAY[]::text[], ARRAY['University of Port Harcourt'],
       ARRAY[]::text[], 'https://renaissance-labs.example/campus-challenge', actor),
      (act_partnership, org, seg_tech, NULL,
       'Partnership announcement: Delta Cloud Infrastructure', 'manual', CURRENT_DATE - 4,
       'Partnership giving RIL portfolio teams subsidised cloud credits and technical support.',
       ARRAY[]::text[], ARRAY['Delta Cloud'],
       ARRAY['Credits for 40 teams'], NULL, actor),
      (act_ailab, org, seg_sme, NULL,
       'AI for Small Business Workshop', 'manual', CURRENT_DATE - 33,
       'Hands-on workshop on using AI tools for customer support and marketing.',
       ARRAY['Ibrahim Musa'], ARRAY['Co-Creation Hub'],
       ARRAY['37 business owners trained'], 'https://renaissance-labs.example/ai-workshop', actor)
    ON CONFLICT (id) DO NOTHING;

    -- ── AI generations (provenance: source → generation → asset) ───────────
    gen_bootcamp    := pg_temp.demo_id('gen:bootcamp:'    || org);
    gen_partnership := pg_temp.demo_id('gen:partnership:' || org);

    INSERT INTO ai_generations (id, organization_id, activity_id, kind, model, created_by, created_at)
    VALUES
      (gen_bootcamp, org, act_bootcamp, 'document_repurposing', 'template-v1', actor, now() - interval '20 days'),
      (gen_partnership, org, act_partnership, 'automation_activity_created', 'template-v1', actor, now() - interval '4 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Content assets across the whole pipeline ───────────────────────────
    asset_blog       := pg_temp.demo_id('asset:blog:'       || org);
    asset_newsletter := pg_temp.demo_id('asset:newsletter:' || org);
    asset_li         := pg_temp.demo_id('asset:li:'         || org);
    asset_ig         := pg_temp.demo_id('asset:ig:'         || org);
    asset_x          := pg_temp.demo_id('asset:x:'          || org);
    asset_yt         := pg_temp.demo_id('asset:yt:'         || org);
    asset_short      := pg_temp.demo_id('asset:short:'      || org);
    asset_high       := pg_temp.demo_id('asset:high:'       || org);

    INSERT INTO content_assets
      (id, organization_id, title, topic, format, platform, channel, hook, cta,
       audience_segment_id, campaign_id, status, sensitivity, body, metadata,
       source_activity_id, generation_id, scheduled_for, published_at,
       views, clicks, shares, comments, saves, registrations, avg_time_seconds, created_at)
    VALUES
      (asset_blog, org,
       'What 24 founders learned in three days at Cohort 4', 'bootcamp recap',
       'blog', 'website', 'website', 'Founder story', 'Apply for the next cohort',
       seg_founders, camp_bootcamp, 'published', 'standard',
       E'Three days, 24 founders, and one recurring realisation: the fastest way to sharpen an idea is to describe it to someone who will not be polite about it.\n\nCohort 4 opened with customer discovery. Most teams arrived convinced their problem was obvious. By the end of day one, two thirds had rewritten their problem statement.\n\nDay two moved to unit economics, where the conversation turned to what a founder can actually control in the first year. Day three was pitching, with feedback from Sahel Capital.\n\nThe strongest pitches shared a shape: a specific customer, a specific cost, an honest number.',
       '{"seo":{"title":"What 24 founders learned at Innovation Bootcamp Cohort 4","description":"Inside RIL Innovation Bootcamp Cohort 4: customer discovery, unit economics and pitching, with 24 pre-seed founders in Port Harcourt.","keywords":["innovation bootcamp","Niger Delta founders","startup programme Nigeria"]},"word_count":214}'::jsonb,
       act_bootcamp, gen_bootcamp, NULL, now() - interval '14 days',
       2840, 412, 96, 31, 44, 37, 218, now() - interval '20 days'),

      (asset_newsletter, org,
       'Cohort 4 wrapped — here is what comes next', 'bootcamp recap',
       'newsletter', 'email', 'email', 'Insider update', 'Apply for Cohort 5',
       seg_founders, camp_bootcamp, 'published', 'standard',
       E'Hi {{first_name}},\n\nCohort 4 finished last week. Twenty-four founders, nine teams, and four pilot partnerships already signed.\n\nThree things worth your time this month: the term-sheet masterclass recording, the Cohort 5 application window, and the Delta Cloud credits now open to alumni.\n\nApplications for Cohort 5 close in three weeks.',
       '{}'::jsonb, act_bootcamp, gen_bootcamp, NULL, now() - interval '12 days',
       1620, 388, 21, 4, 12, 52, 96, now() - interval '13 days'),

      (asset_li, org,
       'Nine teams. Three days. One honest lesson about pitching.', 'bootcamp recap',
       'social post', 'linkedin', 'linkedin', 'Founder story', 'Read the recap',
       seg_founders, camp_bootcamp, 'published', 'standard',
       E'Nine teams pitched on Friday. The strongest did not have the biggest market.\n\nThey had the clearest customer.\n\nCohort 4 wrapped with 24 founders from across the Niger Delta.',
       '{}'::jsonb, act_bootcamp, gen_bootcamp, NULL, now() - interval '13 days',
       9800, 604, 142, 68, 87, 24, 41, now() - interval '15 days'),

      (asset_ig, org,
       'Behind the scenes: Cohort 4 day two', 'bootcamp recap',
       'image caption', 'instagram', 'instagram', 'Behind the scenes', 'Tag a founder',
       seg_students, camp_bootcamp, 'scheduled', 'standard',
       E'Day two, 9am, and the whiteboards were already full. Swipe for the unit-economics session that made everyone recalculate their pricing.\n\n#RIL #InnovationBootcamp #NigerDelta #Startups #Founders',
       '{}'::jsonb, act_bootcamp, gen_bootcamp, now() + interval '2 days',
       NULL, 0, 0, 0, 0, 0, 0, NULL, now() - interval '11 days'),

      (asset_x, org,
       'Cohort 4 in five posts — thread', 'bootcamp recap',
       'social post', 'x', 'x', 'Myth-busting stat', 'Apply for Cohort 5',
       seg_founders, camp_bootcamp, 'scheduled', 'standard',
       E'Cohort 4, in five parts. A thread. 1/ Most founders arrived convinced their problem was obvious. Two thirds had rewritten it by lunch.',
       '{}'::jsonb, act_bootcamp, gen_bootcamp, now() + interval '1 day',
       NULL, 0, 0, 0, 0, 0, 0, NULL, now() - interval '10 days'),

      (asset_yt, org,
       'Fundraising Masterclass — full session', 'fundraising',
       'video description', 'youtube', 'youtube', 'Architecture breakdown', 'Subscribe',
       seg_tech, camp_fundraising, 'published', 'standard',
       E'Chapters:\n00:00 Term sheets without the jargon\n08:40 Dilution, honestly\n21:15 What Nigerian VCs actually look for\n39:02 Q and A with Tunde Adeyemi',
       '{}'::jsonb, act_masterclass, NULL, NULL, now() - interval '6 days',
       4100, 288, 61, 22, 19, 15, 372, now() - interval '9 days'),

      (asset_short, org,
       'Clip: the question that changed the room', 'fundraising',
       'short clip', 'instagram', 'instagram', 'Founder story', 'Watch the full session',
       seg_founders, camp_fundraising, 'review', 'standard',
       E'"What exactly does the customer do today instead of paying you?" — 40 seconds from the masterclass that reset three teams'' assumptions.\n\n#Founders #Nigeria #Fundraising',
       '{}'::jsonb, act_masterclass, NULL, now() + interval '4 days',
       NULL, 0, 0, 0, 0, 0, 0, NULL, now() - interval '2 days'),

      (asset_high, org,
       'RIL partners with Delta Cloud to back 40 teams', 'partnership',
       'blog', 'website', 'website', 'Customer proof', 'Read the announcement',
       seg_tech, NULL, 'approved', 'high',
       E'Renaissance Innovation Labs and Delta Cloud have signed a partnership giving 40 portfolio teams subsidised cloud credits and direct engineering support.\n\nTeams in the Founder Accelerator and Innovation Bootcamp alumni network can apply from next month.',
       '{}'::jsonb, act_partnership, gen_partnership, NULL, NULL,
       0, 0, 0, 0, 0, 0, NULL, now() - interval '3 days'),

      (pg_temp.demo_id('asset:seo:' || org), org,
       'Cohort 5 applications are open — what we look for', 'bootcamp recap',
       'blog', 'website', 'website', 'Myth-busting stat', 'Apply for Cohort 5',
       seg_founders, camp_bootcamp, 'editing', 'standard',
       E'Applications for Innovation Bootcamp Cohort 5 are open.\n\nWe do not read applications for traction. We read them for clarity: can the team say who the customer is, what they do today, and why this team is the one to change it?\n\nThree things that help an application stand out: a problem you have felt yourself, evidence you have spoken to real customers, and an honest description of what you do not know yet.\n\nTwelve weeks, Port Harcourt, and a demo day in February.',
       '{}'::jsonb, act_bootcamp, NULL, NULL, NULL,
       0, 0, 0, 0, 0, 0, NULL, now() - interval '5 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO content_asset_segments (content_asset_id, audience_segment_id)
    VALUES
      (asset_blog, seg_founders), (asset_blog, seg_tech),
      (asset_li, seg_founders), (asset_high, seg_tech), (asset_short, seg_founders)
    ON CONFLICT DO NOTHING;

    -- Approval history (§11) — who moved what, and when.
    INSERT INTO asset_approvals
      (id, organization_id, content_asset_id, actor_id, from_status, to_status, note, created_at)
    VALUES
      (pg_temp.demo_id('approval:blog:gen:'  || org), org, asset_blog, actor, 'idea', 'ai_generated', 'Generated from the Cohort 4 activity.', now() - interval '20 days'),
      (pg_temp.demo_id('approval:blog:edit:' || org), org, asset_blog, actor, 'ai_generated', 'editing', 'Tightened the opening.', now() - interval '17 days'),
      (pg_temp.demo_id('approval:blog:rev:'  || org), org, asset_blog, actor, 'editing', 'review', 'Ready for review.', now() - interval '16 days'),
      (pg_temp.demo_id('approval:blog:appr:' || org), org, asset_blog, actor, 'review', 'approved', 'Approved for the blog.', now() - interval '15 days'),
      (pg_temp.demo_id('approval:blog:pub:'  || org), org, asset_blog, actor, 'approved', 'scheduled', 'Scheduled for the recap slot.', now() - interval '15 days'),
      (pg_temp.demo_id('approval:blog:pub2:' || org), org, asset_blog, actor, 'scheduled', 'published', 'Published via WordPress.', now() - interval '14 days'),
      (pg_temp.demo_id('approval:high:appr:' || org), org, asset_high, actor, 'review', 'approved', 'Partnership wording signed off by leadership.', now() - interval '3 days')
    ON CONFLICT (id) DO NOTHING;

    -- Publications, including one failure so §13 behaviour is visible.
    INSERT INTO publications
      (id, organization_id, content_asset_id, channel, external_id, status, scheduled_for, published_at, error, created_at)
    VALUES
      (pg_temp.demo_id('pub:blog:' || org), org, asset_blog, 'wordpress', 'wp-1041', 'published', NULL, now() - interval '14 days', NULL, now() - interval '14 days'),
      (pg_temp.demo_id('pub:li:'   || org), org, asset_li,   'buffer', 'buf-li-88213', 'published', NULL, now() - interval '13 days', NULL, now() - interval '13 days'),
      (pg_temp.demo_id('pub:yt:'   || org), org, asset_yt,   'buffer', 'buf-yt-88240', 'published', NULL, now() - interval '6 days',  NULL, now() - interval '6 days'),
      (pg_temp.demo_id('pub:fail:' || org), org, asset_ig,   'buffer', NULL, 'failed', now() - interval '1 day', NULL, 'Buffer rejected the post: the connected Instagram channel needs re-authorising.', now() - interval '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- Unique tracked registration links (§6.16).
    INSERT INTO registration_links (id, organization_id, content_asset_id, channel, token, created_at)
    VALUES
      (pg_temp.demo_id('reg:blog:'      || org), org, asset_blog, 'website',   'ril-blog-c4-9f2a',    now() - interval '14 days'),
      (pg_temp.demo_id('reg:li:'        || org), org, asset_li,   'linkedin',  'ril-li-c4-4b71',      now() - interval '13 days'),
      (pg_temp.demo_id('reg:news:'      || org), org, asset_newsletter, 'email', 'ril-mail-c4-77c0',  now() - interval '12 days'),
      (pg_temp.demo_id('reg:ig:'        || org), org, asset_ig,   'instagram', 'ril-ig-c4-2de8',      now() - interval '11 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Insights: the human approval gate ──────────────────────────────────
    run_insights := pg_temp.demo_id('run:insights:' || org);
    INSERT INTO audience_insight_generation_runs
      (id, organization_id, status, started_at, completed_at, date_range_start, date_range_end,
       segments_processed, insights_created, algorithm_version)
    VALUES
      (run_insights, org, 'COMPLETED', now() - interval '2 days', now() - interval '2 days' + interval '40 seconds',
       CURRENT_DATE - 30, CURRENT_DATE, 4, 7, 'v1.0.0')
    ON CONFLICT (id) DO NOTHING;

    ins_topic      := pg_temp.demo_id('ins:topic:'      || org);
    ins_format     := pg_temp.demo_id('ins:format:'     || org);
    ins_platform   := pg_temp.demo_id('ins:platform:'   || org);
    ins_hook       := pg_temp.demo_id('ins:hook:'       || org);
    ins_pending1   := pg_temp.demo_id('ins:pending1:'   || org);
    ins_pending2   := pg_temp.demo_id('ins:pending2:'   || org);
    ins_suppressed := pg_temp.demo_id('ins:suppressed:' || org);

    INSERT INTO audience_insights
      (id, organization_id, segment_id, category, topic, format, platform, hook, cta,
       confidence_score, signal_strength, status, summary, recommendation,
       sample_size, date_range_start, date_range_end, algorithm_version,
       reviewed_by, reviewed_at, review_note,
       suppressed_by, suppressed_at, suppression_reason,
       generation_run_id, source_content_asset_ids, created_at)
    VALUES
      (ins_topic, org, seg_founders, 'TOPIC_ENGAGEMENT', 'fundraising', 'short-form video', 'linkedin', 'Founder story', 'Apply now',
       0.86, 'RISING', 'APPROVED',
       'Fundraising content outperformed general updates by 5.1x on registrations over the last 30 days.',
       'Lead with fundraising stories in the next campaign; keep general updates to a minimum.',
       10, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       actor, now() - interval '2 days', 'Agrees with what we saw anecdotally.',
       NULL, NULL, NULL, run_insights, ARRAY[asset_li], now() - interval '2 days'),

      (ins_format, org, seg_founders, 'FORMAT_REGISTRATION', 'bootcamp recap', 'short-form video', 'linkedin', 'Founder story', 'Apply now',
       0.79, 'STABLE', 'APPROVED',
       'Short-form video produced more registrations per view than static posts on the same topic.',
       'Favour short-form video for registration-driving posts.',
       10, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       actor, now() - interval '2 days', 'Approved.', NULL, NULL, NULL,
       run_insights, ARRAY[asset_li], now() - interval '2 days'),

      (ins_platform, org, seg_founders, 'PLATFORM_LEAD_QUALITY', 'lead quality', 'static post', 'linkedin', 'Generic update', 'Learn more',
       0.81, 'STABLE', 'APPROVED',
       'LinkedIn delivered far fewer leads than a low-quality network but a much higher share of qualified ones.',
       'Weight LinkedIn results by qualification rate, not raw lead volume.',
       50, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       actor, now() - interval '2 days', 'Approved.', NULL, NULL, NULL,
       run_insights, ARRAY[]::uuid[], now() - interval '2 days'),

      (ins_hook, org, seg_founders, 'HOOK_CTA_EFFECTIVENESS', 'bootcamp recap', 'social post', 'linkedin', 'Myth-busting stat', 'Read the recap',
       0.74, 'EMERGING', 'APPROVED',
       'Myth-busting hooks held attention longer than generic update hooks on the same channel.',
       'Test myth-busting hooks on the next two LinkedIn posts.',
       4, CURRENT_DATE - 14, CURRENT_DATE, 'v1.0.0',
       actor, now() - interval '2 days', 'Worth testing.', NULL, NULL, NULL,
       run_insights, ARRAY[asset_li], now() - interval '2 days'),

      (ins_pending1, org, seg_sme, 'PROGRAM_AFFINITY', 'sme growth', 'webinar', 'linkedin', 'Before and after', 'Register',
       0.68, 'EMERGING', 'PENDING_REVIEW',
       'SME owners who attended a webinar registered for the Growth Lab at a higher rate than those reached by social alone.',
       'Consider a webinar-first sequence for the SME segment.',
       89, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       NULL, NULL, NULL, NULL, NULL, NULL, run_insights, ARRAY[]::uuid[], now() - interval '2 days'),

      (ins_pending2, org, seg_students, 'REPEAT_ENGAGEMENT', 'campus', 'carousel', 'instagram', 'Day in the life', 'Follow',
       0.61, 'STABLE', 'PENDING_REVIEW',
       'Students who engaged with two or more campus posts were markedly more likely to open a later email.',
       'Keep campus content flowing weekly rather than in bursts.',
       12, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       NULL, NULL, NULL, NULL, NULL, NULL, run_insights, ARRAY[]::uuid[], now() - interval '2 days'),

      (ins_suppressed, org, seg_founders, 'THEME_TREND', 'general', 'static post', 'facebook', 'Generic update', 'Learn more',
       0.42, 'DECLINING', 'SUPPRESSED',
       'Facebook posts appeared to correlate with registrations over the last 30 days.',
       'Not recommended — sample too small and confounded by the email send in the same week.',
       3, CURRENT_DATE - 30, CURRENT_DATE, 'v1.0.0',
       NULL, NULL, NULL, actor, now() - interval '1 day',
       'Only three posts and the uptick lines up with an email send. Not a real signal.',
       run_insights, ARRAY[]::uuid[], now() - interval '2 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO insight_approvals (id, organization_id, insight_id, actor_id, from_status, to_status, note, created_at)
    VALUES
      (pg_temp.demo_id('insappr:topic:'      || org), org, ins_topic,      actor, 'PENDING_REVIEW', 'APPROVED',   'Approved.', now() - interval '2 days'),
      (pg_temp.demo_id('insappr:format:'     || org), org, ins_format,     actor, 'PENDING_REVIEW', 'APPROVED',   'Approved.', now() - interval '2 days'),
      (pg_temp.demo_id('insappr:platform:'   || org), org, ins_platform,   actor, 'PENDING_REVIEW', 'APPROVED',   'Approved.', now() - interval '2 days'),
      (pg_temp.demo_id('insappr:hook:'       || org), org, ins_hook,       actor, 'PENDING_REVIEW', 'APPROVED',   'Approved for a test.', now() - interval '2 days'),
      (pg_temp.demo_id('insappr:suppressed:' || org), org, ins_suppressed, actor, 'PENDING_REVIEW', 'SUPPRESSED', 'Confounded by an email send.', now() - interval '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- ── KPIs and tasks for the Command Centre ──────────────────────────────
    INSERT INTO kpis (id, organization_id, name, metric, target_value, unit, period, created_at)
    VALUES
      (pg_temp.demo_id('kpi:leads:'     || org), org, 'Qualified leads per year', 'qualified_leads',        1200, 'leads',     'yearly',  now() - interval '60 days'),
      (pg_temp.demo_id('kpi:attrib:'    || org), org, 'Marketing-attributed registrations', 'attributed_registrations', 40, 'percent', 'quarterly', now() - interval '60 days'),
      (pg_temp.demo_id('kpi:conv:'      || org), org, 'Lead-to-conversion rate',  'lead_conversion_rate',   10,   'percent',   'quarterly', now() - interval '60 days'),
      (pg_temp.demo_id('kpi:traffic:'   || org), org, 'Website traffic growth',   'website_sessions_growth', 30,  'percent',   'yearly',  now() - interval '60 days'),
      (pg_temp.demo_id('kpi:organic:'   || org), org, 'Organic traffic growth',   'organic_sessions_growth', 25,  'percent',   'yearly',  now() - interval '60 days'),
      (pg_temp.demo_id('kpi:social:'    || org), org, 'Social audience growth',   'social_audience_growth',  30,  'percent',   'yearly',  now() - interval '60 days'),
      (pg_temp.demo_id('kpi:email:'     || org), org, 'Email database growth',    'email_database_growth',   25,  'percent',   'yearly',  now() - interval '60 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO tasks (id, organization_id, type, title, status, insight_id, created_at, completed_at)
    VALUES
      (pg_temp.demo_id('task:ins1:' || org), org, 'insight_review', 'Review 2 pending insights for SME and Students', 'open', ins_pending1, now() - interval '2 days', NULL),
      (pg_temp.demo_id('task:ins2:' || org), org, 'insight_review', 'Confirm the funnel drop-off insight', 'open', ins_pending2, now() - interval '2 days', NULL),
      (pg_temp.demo_id('task:pub:'  || org), org, 'asset_review',   'Approve the partnership announcement for publishing', 'open', NULL, now() - interval '3 days', NULL),
      (pg_temp.demo_id('task:fail:' || org), org, 'publish_failed', 'Instagram post failed to publish — re-authorise the channel', 'open', NULL, now() - interval '1 day', NULL),
      (pg_temp.demo_id('task:done:' || org), org, 'insight_review', 'Approve the fundraising topic insight', 'done', ins_topic, now() - interval '3 days', now() - interval '2 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Landing pages ──────────────────────────────────────────────────────
    lp_bootcamp := pg_temp.demo_id('lp:bootcamp:' || org);
    lp_webinar  := pg_temp.demo_id('lp:webinar:'  || org);

    INSERT INTO landing_pages
      (id, organization_id, campaign_id, activity_id, audience_segment_id, slug, title,
       headline, body, cta_label, registration_url, meta_description, status,
       created_by, approved_by, published_by, metadata, created_at)
    VALUES
      (lp_bootcamp, org, camp_bootcamp, act_bootcamp, seg_founders,
       'innovation-bootcamp-cohort-5', 'Innovation Bootcamp — Cohort 5',
       'Three days that change how you build',
       E'Cohort 4 finished with nine teams and four pilot partnerships. Cohort 5 opens with the same format: customer discovery, unit economics, and a pitch reviewed by real investors.\n\nThirty places. Port Harcourt.',
       'Apply for Cohort 5', 'https://renaissance-labs.example/bootcamp',
       'Apply for Innovation Bootcamp Cohort 5 — three days of customer discovery, unit economics and pitching for pre-seed founders.',
       'published', actor, actor, actor, '{}'::jsonb, now() - interval '18 days'),
      (lp_webinar, org, NULL, act_webinar, seg_sme,
       'sme-growth-webinar', 'SME Growth Webinar',
       'Turn WhatsApp enquiries into repeatable sales',
       E'A practical session for business owners on tracking where enquiries come from and turning them into repeat custom.',
       'Save my seat', 'https://renaissance-labs.example/sme-webinar',
       'Free webinar for SME owners on turning WhatsApp enquiries into trackable, repeatable sales.',
       'review', actor, NULL, NULL, '{}'::jsonb, now() - interval '5 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Leads ──────────────────────────────────────────────────────────────
    -- 20 generated leads for volume, plus two hand-authored edge cases.
    INSERT INTO leads
      (id, organization_id, email, name, phone, organisation, interest,
       audience_segment_id, campaign_id, landing_page_id, source_platform,
       source_content_asset_id, funnel_stage, is_qualified, is_converted,
       marketing_consent, marketing_consent_at, owner_id, notes, score, score_reason,
       registration_token, created_at)
    SELECT
      pg_temp.demo_id('lead:' || g || ':' || org), org,
      'founder' || g || '@example.com',
      (ARRAY['Amaka Obi','Tunde Bakare','Zainab Yusuf','Chidi Okonkwo','Halima Sani',
             'Segun Adeleke','Ngozi Umeh','Bola Ajayi','Ike Nwachukwu','Rita Bassey'])[1 + (g % 10)]
        || ' ' ||
        (ARRAY['Adeyemi','Eneh','Lawal','Danjuma','Okafor','Ogun','Bello','Uzoma','Onyeka','Fashola'])[1 + ((g - 1) / 10)],
      '+23480' || lpad((10000000 + g)::text, 8, '0'),
      (ARRAY['Northgate Logistics','Riverine Foods','Kobo Labs','Sahel Health','BrightPath Edu'])[1 + (g % 5)],
      (ARRAY['Cohort 5 seat','Cloud credits','Fundraising support','SME growth','Partnership'])[1 + (g % 5)],
      CASE WHEN g % 2 = 0 THEN seg_founders ELSE seg_tech END,
      CASE WHEN g % 3 = 0 THEN camp_bootcamp ELSE camp_fundraising END,
      CASE WHEN g % 4 = 0 THEN lp_bootcamp ELSE NULL END,
      (ARRAY['linkedin','instagram','email','website'])[1 + (g % 4)],
      CASE WHEN g % 2 = 0 THEN asset_li ELSE asset_blog END,
      (ARRAY['awareness','engagement','captured','nurturing','converted','retention'])[1 + (g % 6)],
      (g % 3 <> 0),
      (g % 7 = 0),
      (g % 5 <> 0),
      CASE WHEN g % 5 <> 0 THEN now() - ((g % 25) + 1) * interval '1 day' ELSE NULL END,
      actor,
      CASE WHEN g % 3 = 0 THEN 'Asked about the next cohort dates.' ELSE NULL END,
      CASE WHEN g % 3 = 0 THEN 'hot' WHEN g % 3 = 1 THEN 'warm' ELSE 'cold' END,
      CASE WHEN g % 3 = 0 THEN 'Registered for a tracked link and opened three emails.'
           WHEN g % 3 = 1 THEN 'Engaged with two posts but has not registered.'
           ELSE 'Single form submission, no further engagement.' END,
      'lead-tok-' || g || '-' || substr(md5(org::text), 1, 6),
      now() - ((g % 30) + 1) * interval '1 day'
    FROM generate_series(1, 20) g
    ON CONFLICT (id) DO NOTHING;

    lead_hot   := pg_temp.demo_id('lead:hot:'   || org);
    lead_unsub := pg_temp.demo_id('lead:unsub:' || org);

    INSERT INTO leads
      (id, organization_id, email, name, phone, organisation, interest,
       audience_segment_id, campaign_id, source_platform, source_content_asset_id,
       funnel_stage, is_qualified, is_converted, marketing_consent, marketing_consent_at,
       owner_id, notes, score, score_reason, email_unsubscribed_at, created_at)
    VALUES
      (lead_hot, org, 'ada.eze@example.com', 'Ada Eze', '+2348031234567', 'Eze Analytics',
       'Founder Accelerator', seg_founders, camp_bootcamp, 'linkedin', asset_li,
       'nurturing', true, false, true, now() - interval '9 days', actor,
       'Meeting booked for Thursday. Brings two co-founders.',
       'hot', 'Opened every email in the series, downloaded the term-sheet template, booked a call.',
       NULL, now() - interval '22 days'),
      (lead_unsub, org, 'past.contact@example.com', 'Musa Ibrahim', NULL, 'Ibrahim Retail',
       'SME growth', seg_sme, NULL, 'email', asset_newsletter,
       'captured', false, false, true, now() - interval '48 days', actor,
       'Unsubscribed after the third send. Do not contact.',
       'cold', 'Unsubscribed; excluded from all sends.', now() - interval '11 days',
       now() - interval '50 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO lead_follow_ups
      (id, organization_id, lead_id, title, due_at, outcome, completed_at, created_by, created_at)
    VALUES
      (pg_temp.demo_id('fu:1:' || org), org, lead_hot, 'Call Ada about the Accelerator', CURRENT_DATE, NULL, NULL, actor, now() - interval '3 days'),
      (pg_temp.demo_id('fu:2:' || org), org, lead_hot, 'Send the term-sheet template', CURRENT_DATE - 2, 'Sent by email.', now() - interval '2 days', actor, now() - interval '4 days'),
      (pg_temp.demo_id('fu:3:' || org), org, pg_temp.demo_id('lead:1:' || org), 'Confirm bootcamp seat for Northgate Logistics', CURRENT_DATE - 1, NULL, NULL, actor, now() - interval '5 days'),
      (pg_temp.demo_id('fu:4:' || org), org, pg_temp.demo_id('lead:2:' || org), 'Intro call with BrightPath Edu', CURRENT_DATE + 3, NULL, NULL, actor, now() - interval '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- ── Trends ─────────────────────────────────────────────────────────────
    INSERT INTO trends
      (id, organization_id, title, source, source_url, source_item_id, source_published_at,
       summary, relevance, angle, audience, risk, status, analysis_status, created_by, created_at)
    VALUES
      (pg_temp.demo_id('trend:1:' || org), org,
       'Nigerian fintechs push into informal savings groups', 'TechCabal',
       'https://techcabal.com/2026/09/18/informal-savings-fintech', 'tc-2026-09-18-savings',
       now() - interval '5 days',
       'Several Nigerian fintechs are building products aimed at ajo and esusu savings groups.',
       'High — RIL runs SME programmes where informal savings are the norm.',
       'Frame the SME Growth Lab around formalising group savings rather than replacing it.',
       'SME Owners', 'Low — factual reporting, no contested claims.', 'approved', 'analysed', actor, now() - interval '5 days'),

      (pg_temp.demo_id('trend:2:' || org), org,
       'Google expands AI literacy funding for African universities', 'TechCabal',
       'https://techcabal.com/2026/09/15/ai-literacy-funding', 'tc-2026-09-15-ai-literacy',
       now() - interval '8 days',
       'New funding line for AI literacy programmes at African universities.',
       'Medium — relevant to the Campus Innovation Challenge.',
       'Position RIL campus programmes as a delivery partner.',
       'University Students', 'Low — announcements are verifiable.', 'approved', 'analysed', actor, now() - interval '8 days'),

      (pg_temp.demo_id('trend:3:' || org), org,
       'Cloud costs rise again for African startups', 'Disrupt Africa',
       'https://disruptafrica.com/2026/09/12/cloud-costs', 'da-2026-09-12-cloud-costs',
       now() - interval '11 days',
       'Cloud pricing increases push early-stage teams towards cost engineering.',
       'High — directly relevant to the Delta Cloud partnership.',
       'Tie the partnership announcement to measurable cost savings.',
       'Tech Entrepreneurs', 'Medium — supplier pricing claims change often; verify before citing.', 'new', 'analysed', actor, now() - interval '11 days'),

      (pg_temp.demo_id('trend:4:' || org), org,
       'Rivers State announces a new innovation corridor', 'TechCabal',
       'https://techcabal.com/2026/09/10/rivers-innovation-corridor', 'tc-2026-09-10-corridor',
       now() - interval '13 days',
       'State government outlines plans for an innovation corridor in Port Harcourt.',
       'High — RIL is Port Harcourt based.',
       'Offer RIL as the delivery partner with the bootcamp as proof of capability.',
       'Early-stage Founders', 'Medium — policy announcements frequently slip; avoid dates.', 'new', 'analysed', actor, now() - interval '13 days'),

      (pg_temp.demo_id('trend:5:' || org), org,
       'Viral claim: AI will replace 40% of marketing roles in Nigeria by 2027', 'X',
       'https://www.twitter.com/status/0000000000', 'x-2026-09-09-ai-roles',
       now() - interval '14 days',
       'A widely shared post asserting large-scale marketing job displacement, sourced to an unnamed report.',
       'Low — no verifiable source for the statistic.',
       'Do not amplify the number. If addressed at all, discuss how teams use AI, not headcount.',
       'SME Owners', 'High — unsourced statistic and reputational exposure.', 'dismissed', 'unanalysed', actor, now() - interval '14 days'),

      (pg_temp.demo_id('trend:6:' || org), org,
       'African VC funding shifts toward climate and health', 'Disrupt Africa',
       'https://disruptafrica.com/2026/09/08/vc-shift', 'da-2026-09-08-vc-shift',
       now() - interval '15 days',
       'Quarterly data shows climate and health taking a larger share of early-stage funding.',
       'Medium — shapes what founders in the Accelerator should be raising into.',
       'A newsletter analysing the shift, with the source linked.',
       'Early-stage Founders', 'Low.', 'new', 'analysed', actor, now() - interval '15 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Brand knowledge ────────────────────────────────────────────────────
    INSERT INTO brand_knowledge
      (id, organization_id, category, title, content, source_url, is_active, created_by, created_at)
    VALUES
      (pg_temp.demo_id('bk:voice:' || org), org, 'brand_voice', 'RIL tone of voice',
       E'Optimistic, witty, confident, clear. Short sentences. No jargon. Classy, not stuffy; bold, not brash. End on a high note. Write to a smart peer, never down to the reader.',
       NULL, true, actor, now() - interval '70 days'),
      (pg_temp.demo_id('bk:org:'   || org), org, 'organization', 'About Renaissance Innovation Labs',
       E'RIL is a Port Harcourt based innovation lab building programmes for founders, students and small businesses across the Niger Delta. Programmes include the Innovation Bootcamp, the Founder Accelerator and the SME Growth Lab.',
       'https://www.renaissancelabs.org', true, actor, now() - interval '70 days'),
      (pg_temp.demo_id('bk:prog1:' || org), org, 'program', 'Innovation Bootcamp',
       E'Three-day intensive for pre-seed founders: customer discovery, unit economics and pitching. Cohorts run quarterly, roughly 30 places, hosted in Port Harcourt.',
       NULL, true, actor, now() - interval '70 days'),
      (pg_temp.demo_id('bk:prog2:' || org), org, 'program', 'Founder Accelerator',
       E'Twelve-week support programme for pre-seed teams, including cloud credits through the Delta Cloud partnership.',
       NULL, true, actor, now() - interval '70 days'),
      (pg_temp.demo_id('bk:aud1:'  || org), org, 'audience', 'Early-stage Founders',
       E'Pre-seed and seed founders raising a first round. Motivated by first capital, first customers and telling a fundable story. Prefers short-form video and case studies on LinkedIn.',
       NULL, true, actor, now() - interval '70 days'),
      (pg_temp.demo_id('bk:msg:'   || org), org, 'approved_message', 'Approved partnership wording',
       E'Use "partnership" only for signed agreements. Never imply endorsement of a partner''s products, never state funding amounts, and never quote a partner without written approval.',
       NULL, true, actor, now() - interval '60 days'),
      (pg_temp.demo_id('bk:term:'  || org), org, 'terminology', 'Preferred terms',
       E'Use "founders" not "entrepreneurs" in programme copy. Use "Niger Delta" not "the South-South". Use "Port Harcourt" not "PH". Programme names are proper nouns and always capitalised.',
       NULL, true, actor, now() - interval '60 days'),
      (pg_temp.demo_id('bk:pol:'   || org), org, 'policy', 'Claims and statistics policy',
       E'Never publish an unsourced statistic. Attribute every external figure to its publisher and link the source. Distinguish what RIL observed from what RIL believes. No invented testimonials, customers, benchmarks or pricing.',
       NULL, true, actor, now() - interval '60 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Email campaigns + delivery metrics ─────────────────────────────────
    mail_recap := pg_temp.demo_id('mail:recap:'  || org);
    mail_invite := pg_temp.demo_id('mail:invite:' || org);
    mail_draft := pg_temp.demo_id('mail:draft:'  || org);

    INSERT INTO email_campaigns
      (id, organization_id, campaign_id, audience_segment_id, name, subject, preview_text,
       body, status, created_by, approved_by, scheduled_at, metadata, created_at)
    VALUES
      (mail_recap, org, camp_bootcamp, seg_founders, 'Cohort 4 recap',
       'Cohort 4 wrapped — here is what comes next',
       'Nine teams, four pilots, and the Cohort 5 window.',
       E'Hi {{first_name}},\n\nCohort 4 finished last week with nine teams and four pilot partnerships signed. Applications for Cohort 5 open Monday.\n\nThree things worth your time: the masterclass recording, the Cohort 5 window, and the Delta Cloud credits now open to alumni.',
       'sent', actor, actor, now() - interval '12 days', '{}'::jsonb, now() - interval '14 days'),

      (mail_invite, org, camp_bootcamp, seg_founders, 'Cohort 5 applications open',
       'Cohort 5 is open — 30 places',
       'Customer discovery, unit economics, pitching. Three days.',
       E'Hi {{first_name}},\n\nApplications for Innovation Bootcamp Cohort 5 are open. Thirty places, three days, Port Harcourt.\n\nCohort 4 shipped nine teams and four partnerships. If you are pre-seed and building, this is built for you.',
       'approved', actor, actor, now() + interval '3 days', '{}'::jsonb, now() - interval '2 days'),

      (mail_draft, org, camp_campus, seg_students, 'Campus Challenge launch',
       'The Campus Innovation Challenge is here',
       'Inter-university, open to final-year students.',
       E'Hi {{first_name}},\n\nWe are launching the Campus Innovation Challenge with the University of Port Harcourt. Teams of up to four, open to final-year students across Rivers State.',
       'draft', actor, NULL, NULL, '{}'::jsonb, now() - interval '1 day')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO email_campaign_deliveries
      (id, organization_id, campaign_id, lead_id, status, provider_message_id,
       unsubscribe_token_hash, sent_at, delivered_at, opened_count, clicked_count,
       first_opened_at, first_clicked_at, created_at)
    SELECT
      pg_temp.demo_id('deliv:' || g || ':' || org), org, mail_recap,
      pg_temp.demo_id('lead:' || g || ':' || org),
      st.status,
      'resend-msg-' || lpad(g::text, 6, '0') || '-' || substr(md5(org::text), 1, 6),
      'unsub-' || g || '-' || substr(md5(org::text || 'u'), 1, 8),
      now() - interval '12 days',
      CASE WHEN st.status <> 'bounced' THEN now() - interval '12 days' + interval '1 minute' END,
      CASE WHEN st.status IN ('opened', 'clicked') THEN 2 ELSE 0 END,
      CASE WHEN st.status = 'clicked' THEN 1 ELSE 0 END,
      CASE WHEN st.status IN ('opened', 'clicked') THEN now() - interval '11 days' END,
      CASE WHEN st.status = 'clicked' THEN now() - interval '11 days' + interval '4 minutes' END,
      now() - interval '12 days'
    FROM generate_series(1, 10) g
    CROSS JOIN LATERAL (
      SELECT (ARRAY['delivered','opened','clicked','delivered','opened','bounced','delivered','opened','clicked','delivered'])[1 + (g % 10)] AS status
    ) st
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO email_provider_events
      (id, organization_id, provider_event_id, provider_message_id, event_type, occurred_at, processed_at)
    VALUES
      (pg_temp.demo_id('evt:1:' || org), org, 'evt-delivered-1', 'resend-msg-000001-' || substr(md5(org::text),1,6), 'email.delivered', now() - interval '12 days', now() - interval '12 days'),
      (pg_temp.demo_id('evt:2:' || org), org, 'evt-opened-1',    'resend-msg-000001-' || substr(md5(org::text),1,6), 'email.opened',    now() - interval '11 days', now() - interval '11 days'),
      (pg_temp.demo_id('evt:3:' || org), org, 'evt-bounced-1',   'resend-msg-000006-' || substr(md5(org::text),1,6), 'email.bounced',   now() - interval '12 days', now() - interval '12 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Community inbox ────────────────────────────────────────────────────
    INSERT INTO community_items
      (id, organization_id, platform, external_url, author_label, body, category, priority,
       reply_draft, status, created_by, approved_by, ai_model, created_at)
    VALUES
      (pg_temp.demo_id('cm:1:' || org), org, 'linkedin', 'https://linkedin.com/posts/example-1',
       'Chidera M.', 'I applied for Cohort 3 and never heard back. Is anyone actually reading these applications?',
       'complaint', 'high', 'Sorry for the silence — that is on us. I have looked up your application and sent you a direct message with a decision.', 'reviewed', actor, NULL, 'template-v1', now() - interval '2 days'),
      (pg_temp.demo_id('cm:2:' || org), org, 'instagram', 'https://instagram.com/p/example-2',
       'brightpath_edu', 'Do you run the bootcamp in Lagos or only Port Harcourt? We have four founders who would come.',
       'lead', 'high', 'Port Harcourt for Cohort 5, with a Lagos cohort planned. Send me your founders'' names and I will hold places.', 'reply_approved', actor, actor, 'template-v1', now() - interval '3 days'),
      (pg_temp.demo_id('cm:3:' || org), org, 'x', 'https://twitter.com/example/status/3',
       'nkechi_dev', 'The unit economics session was the most useful three hours I have spent this year. Genuinely.',
       'praise', 'normal', 'Thank you — that session is the one that changes the room most weeks.', 'replied', actor, actor, 'template-v1', now() - interval '5 days'),
      (pg_temp.demo_id('cm:4:' || org), org, 'youtube', 'https://youtube.com/watch?v=example4',
       'Tunde A.', 'What template do you use for the cap table in the masterclass?',
       'question', 'normal', 'It is in the resources link in the video description — the term-sheet template under the third chapter.', 'reply_approved', actor, actor, 'template-v1', now() - interval '4 days'),
      (pg_temp.demo_id('cm:5:' || org), org, 'instagram', NULL,
       'growth_hackz_ng', 'DM us for 10k followers guaranteed, no bots, fast delivery',
       'spam', 'normal', '', 'ignored', actor, NULL, 'rules-v1', now() - interval '6 days'),
      (pg_temp.demo_id('cm:6:' || org), org, 'linkedin', 'https://linkedin.com/posts/example-6',
       'Sahel Capital', 'Enjoyed hosting the masterclass. Happy to discuss a recurring series.',
       'partnership', 'high', 'We would like that. I will email you two dates next week.', 'reviewed', actor, NULL, 'template-v1', now() - interval '7 days'),
      (pg_temp.demo_id('cm:7:' || org), org, 'x', 'https://twitter.com/example/status/7',
       'anonymous_handle', 'I have heard RIL sells your contact list to sponsors. Is that true?',
       'reputational_risk', 'high', 'We do not and never have sold or shared contact details. Happy to talk through exactly how we handle data.', 'reviewed', actor, NULL, 'template-v1', now() - interval '8 days')
    ON CONFLICT (id) DO NOTHING;

    -- ── Reports ────────────────────────────────────────────────────────────
    report_monthly := pg_temp.demo_id('report:monthly:' || org);
    INSERT INTO marketing_reports
      (id, organization_id, period_type, period_start, period_end, metrics, narrative, model,
       status, created_by, reviewed_by, created_at, reviewed_at, generated_by_schedule)
    VALUES
      (report_monthly, org, 'monthly', CURRENT_DATE - 30, CURRENT_DATE,
       jsonb_build_object(
         'leads_captured', 20, 'leads_qualified', 13, 'leads_converted', 2,
         'registrations_attributed', 37, 'content_published', 4,
         'email_sent', 10, 'email_opened', 5, 'email_clicked', 2,
         'insights_approved', 4, 'insights_suppressed', 1),
       E'Twenty leads arrived this month and thirteen qualified — a 65% qualification rate, ahead of the 40% target pace.\n\nLinkedIn carried the strongest signal: it produced fewer leads than the mass-registration channel but a much higher share of qualified ones. The approved platform insight supports weighting LinkedIn by qualification rather than raw volume.\n\nThree things to change next month: put fundraising content at the front of the calendar, keep general updates to a minimum, and fix the Instagram channel, which has now failed to publish once.\n\nThese are recommendations drawn from the last 30 days and do not establish causation.',
       'workspace-summary', 'reviewed', actor, actor, now() - interval '1 day', now() - interval '20 hours', false),
      (pg_temp.demo_id('report:weekly:' || org), org, 'weekly', CURRENT_DATE - 7, CURRENT_DATE,
       jsonb_build_object('leads_captured', 5, 'content_scheduled', 2, 'email_opened', 3),
       E'A quiet week by design — most of the work sat in review. Two drafts moved to scheduled and one partnership announcement is waiting on sign-off.\n\nThe open question is the Campus Challenge: the campaign is still in draft with ten days to its start date.',
       'workspace-summary', 'draft', actor, NULL, now() - interval '6 hours', NULL, false)
    ON CONFLICT (id) DO NOTHING;

    -- ── Automation, trend monitoring, report schedule ──────────────────────
    INSERT INTO automation_settings (organization_id, activity_to_drafts_enabled, updated_by, updated_at)
    VALUES (org, true, actor, now() - interval '20 days')
    ON CONFLICT (organization_id) DO NOTHING;

    INSERT INTO automation_events
      (id, organization_id, event_type, record_id, status, attempts, result, error, created_at, processed_at)
    VALUES
      (pg_temp.demo_id('auto:1:' || org), org, 'activity_created', act_partnership, 'completed', 1,
       ('{"drafts_created":4,"generation_id":"' || gen_partnership::text || '"}')::jsonb, NULL,
       now() - interval '4 days', now() - interval '4 days' + interval '35 seconds'),
      (pg_temp.demo_id('auto:2:' || org), org, 'activity_created', act_ailab, 'completed', 1,
       '{"drafts_created":3}'::jsonb, NULL, now() - interval '33 days', now() - interval '33 days' + interval '28 seconds'),
      (pg_temp.demo_id('auto:3:' || org), org, 'activity_created', act_challenge, 'failed', 2,
       '{}'::jsonb, 'The scheduled date is in the future, so no recap drafts were generated.',
       now() - interval '1 day', now() - interval '1 day' + interval '12 seconds'),
      (pg_temp.demo_id('auto:4:' || org), org, 'lead_captured', lead_hot, 'queued', 0,
       '{}'::jsonb, NULL, now() - interval '2 hours', NULL)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO trend_monitoring_settings (organization_id, enabled, last_synced_at, updated_by, updated_at)
    VALUES (org, true, now() - interval '9 hours', actor, now() - interval '9 hours')
    ON CONFLICT (organization_id) DO NOTHING;

    INSERT INTO report_schedule_settings (organization_id, frequency, updated_by, updated_at)
    VALUES (org, 'weekly', actor, now() - interval '15 days')
    ON CONFLICT (organization_id) DO NOTHING;

    -- ── Fabricated connections (see header) ────────────────────────────────
    INSERT INTO integrations (organization_id, key, display_name, status, config, updated_at)
    VALUES
      (org, 'buffer', 'Buffer', 'connected',
       jsonb_build_object(
         'accessToken', 'demo-buffer-access-token',
         'refreshToken', 'demo-buffer-refresh-token',
         'expiresAt', (now() + interval '30 days')::text,
         'bufferOrganizationId', 'demo-buffer-org',
         'bufferOrganizationName', 'Renaissance Innovation Labs',
         'channels', jsonb_build_array(
           jsonb_build_object('id','ch-li-1','name','renaissancelabs','displayName','RIL','service','linkedin','type','Page','descriptor','LinkedIn Page','avatar',NULL,'isQueuePaused',false,'isDisconnected',false,'isLocked',false),
           jsonb_build_object('id','ch-ig-1','name','renaissancelabs','displayName','RIL','service','instagram','type','Business','descriptor','Instagram Business','avatar',NULL,'isQueuePaused',false,'isDisconnected',false,'isLocked',false),
           jsonb_build_object('id','ch-x-1','name','renaissancelabs','displayName','RIL','service','twitter','type','Profile','descriptor','Twitter Profile','avatar',NULL,'isQueuePaused',false,'isDisconnected',false,'isLocked',false),
           jsonb_build_object('id','ch-tt-1','name','renaissancelabs','displayName','RIL','service','tiktok','type','Account','descriptor','TikTok Account','avatar',NULL,'isQueuePaused',true,'isDisconnected',false,'isLocked',false),
           jsonb_build_object('id','ch-yt-1','name','RIL Nigeria','displayName','RIL Nigeria','service','youtube','type','Page','descriptor','YouTube Channel','avatar',NULL,'isQueuePaused',false,'isDisconnected',false,'isLocked',false)
         )
       ),
       now() - interval '18 days'),
      (org, 'cms_wordpress', 'WordPress publishing', 'connected',
       jsonb_build_object('siteUrl','https://renaissance-labs.example','username','ril-editor',
         'applicationPassword','demo-not-a-real-password','user','RIL Editor'),
       now() - interval '16 days'),
      (org, 'google_analytics', 'Google Analytics 4 and Search Console', 'connected',
       jsonb_build_object('credentials','{}','ga4PropertyId','412356789',
         'searchConsoleSiteUrl','https://renaissance-labs.example/'),
       now() - interval '16 days'),
      (org, 'email_resend', 'Resend email delivery', 'connected',
       jsonb_build_object('apiKey','re_demo_not_a_real_key','webhookSecret','whsec_demo_not_real',
         'fromEmail','marketing@renaissance-labs.example','fromName','Renaissance Innovation Labs','replyTo',''),
       now() - interval '15 days')
    ON CONFLICT (organization_id, key) DO NOTHING;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS pg_temp.demo_id(text);

-- Summary so you can confirm at a glance.
SELECT 'organizations' AS table_name, count(*) FROM organizations
UNION ALL SELECT 'audience_segments', count(*) FROM audience_segments
UNION ALL SELECT 'campaigns', count(*) FROM campaigns
UNION ALL SELECT 'activities', count(*) FROM activities
UNION ALL SELECT 'content_assets', count(*) FROM content_assets
UNION ALL SELECT 'audience_insights', count(*) FROM audience_insights
UNION ALL SELECT 'leads', count(*) FROM leads
UNION ALL SELECT 'kpis', count(*) FROM kpis
UNION ALL SELECT 'tasks', count(*) FROM tasks
UNION ALL SELECT 'trends', count(*) FROM trends
UNION ALL SELECT 'brand_knowledge', count(*) FROM brand_knowledge
UNION ALL SELECT 'landing_pages', count(*) FROM landing_pages
UNION ALL SELECT 'email_campaigns', count(*) FROM email_campaigns
UNION ALL SELECT 'community_items', count(*) FROM community_items
UNION ALL SELECT 'marketing_reports', count(*) FROM marketing_reports
UNION ALL SELECT 'integrations', count(*) FROM integrations
ORDER BY table_name;
