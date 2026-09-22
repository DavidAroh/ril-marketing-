-- ============================================================================
-- DEVELOPMENT SEED ONLY — never run against production.
-- Run: supabase db reset (applies migrations + this seed) or psql < this file
-- against a LOCAL database. All rows use a fixed dev organization.
-- Rich enough that the generation job fires all four v1 categories for the
-- Early-stage Founders segment (acceptance: 30 days of data → ≥1 insight
-- per implemented category).
-- ============================================================================
DO $$
DECLARE
  dev_org uuid := '00000000-0000-4000-8000-000000000001';
  seg_founders uuid := '00000000-0000-4000-8000-000000000011';
  seg_students uuid := '00000000-0000-4000-8000-000000000012';
  seg_sme uuid := '00000000-0000-4000-8000-000000000013';
  seg_tech uuid := '00000000-0000-4000-8000-000000000014';
  camp_founders uuid := '00000000-0000-4000-8000-000000000021';
  camp_campus uuid := '00000000-0000-4000-8000-000000000022';
BEGIN
  INSERT INTO organizations (id, name)
  VALUES (dev_org, '[DEV] RIL Demo Org')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO programs (id, organization_id, name, slug, description)
  VALUES
    (gen_random_uuid(), dev_org, 'Founder Accelerator', 'founder-accelerator', 'Pre-seed → seed program'),
    (gen_random_uuid(), dev_org, 'Student Builders', 'student-builders', 'Campus entrepreneurship track'),
    (gen_random_uuid(), dev_org, 'SME Growth Lab', 'sme-growth-lab', 'Growth systems for SMEs')
  ON CONFLICT DO NOTHING;

  INSERT INTO audience_segments
    (id, organization_id, name, description, needs_motivations, preferred_formats, preferred_platforms, preferred_hooks)
  VALUES
    (seg_founders, dev_org, 'Early-stage Founders', 'Pre-seed/seed founders raising their first round.',
      ARRAY['Raise first capital','Find first customers','Fundraising storytelling'],
      ARRAY['short-form video','carousel'], ARRAY['linkedin','x'], ARRAY['Founder story','Myth-busting stat']),
    (seg_students, dev_org, 'Students', 'University students exploring startups.',
      ARRAY['Learn startup basics','Find internships','Build portfolio'],
      ARRAY['short-form video','meme'], ARRAY['instagram','tiktok'], ARRAY['Day in the life','Behind the scenes']),
    (seg_sme, dev_org, 'SMEs', 'Small businesses digitising sales and marketing.',
      ARRAY['Get more leads','Systemise marketing','Measure ROI'],
      ARRAY['case study','webinar'], ARRAY['linkedin','facebook'], ARRAY['Before/after','Customer proof']),
    (seg_tech, dev_org, 'Tech Entrepreneurs', 'Technical founders scaling product and team.',
      ARRAY['Hire engineers','Scale infrastructure','Ship faster'],
      ARRAY['technical deep-dive','newsletter'], ARRAY['linkedin','youtube'], ARRAY['Architecture breakdown','Benchmarks'])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO campaigns (id, organization_id, audience_segment_id, name, status, starts_on, ends_on)
  VALUES
    (camp_founders, dev_org, seg_founders, 'Q3 Founder Sprint', 'active',
      CURRENT_DATE - 30, CURRENT_DATE + 30),
    (camp_campus, dev_org, seg_students, 'Campus Drive', 'draft',
      CURRENT_DATE, CURRENT_DATE + 60)
  ON CONFLICT (id) DO NOTHING;

  -- High-engagement fundraising assets (topic winner).
  INSERT INTO content_assets
    (organization_id, audience_segment_id, campaign_id, title, topic, format, platform, hook, cta, views, clicks, shares, comments, saves, registrations, created_at)
  SELECT dev_org, seg_founders, camp_founders, 'How we raised pre-seed ' || g, 'fundraising', 'short-form video', 'linkedin',
    'Founder story', 'Apply now', 1000 + g * 40, 90 + g * 4, 12, 8, 10, 18 + (g % 3),
    now() - ((g * 3) % 30 + 1) * interval '1 day'
  FROM generate_series(1, 10) g
  ON CONFLICT DO NOTHING;

  -- High-impression, low-conversion baseline (registration loser).
  INSERT INTO content_assets
    (organization_id, audience_segment_id, campaign_id, title, topic, format, platform, hook, cta, views, clicks, shares, comments, saves, registrations, created_at)
  SELECT dev_org, seg_founders, camp_founders, 'General update ' || g, 'general', 'static post', 'linkedin',
    'Generic update', 'Learn more', 5000, 40, 4, 3, 5, 1,
    now() - ((g * 7) % 30 + 1) * interval '1 day'
  FROM generate_series(1, 10) g
  ON CONFLICT DO NOTHING;

  -- High-quality leads (small, qualified) vs high-volume junk (quality loser).
  INSERT INTO leads
    (organization_id, audience_segment_id, email, source_platform, is_qualified, is_converted, created_at)
  SELECT dev_org, seg_founders, 'hq' || g || '@example.com', 'linkedin',
    true, (g <= 3), now() - (g % 30 + 1) * interval '1 day'
  FROM generate_series(1, 10) g
  ON CONFLICT DO NOTHING;

  INSERT INTO leads
    (organization_id, audience_segment_id, email, source_platform, is_qualified, is_converted, created_at)
  SELECT dev_org, seg_founders, 'junk' || g || '@example.com', 'low-quality-network',
    (g <= 2), false, now() - (g % 30 + 1) * interval '1 day'
  FROM generate_series(1, 40) g
  ON CONFLICT DO NOTHING;

  -- Analytics events behind the founder assets (traceability for insights).
  INSERT INTO analytics_events
    (organization_id, audience_segment_id, event_type, content_asset_id, metadata, created_at)
  SELECT dev_org, seg_founders,
    (ARRAY['view','view','view','click','share','comment','save','register'])[1 + ((g + a.n) % 8)],
    a.id,
    jsonb_build_object('seeded', true),
    now() - (((g * 5) + a.n) % 30 + 1) * interval '1 day'
  FROM (
    SELECT id, row_number() OVER () AS n
    FROM content_assets
    WHERE organization_id = dev_org AND audience_segment_id = seg_founders
  ) a
  CROSS JOIN generate_series(1, 12) g
  ON CONFLICT DO NOTHING;

  -- Activities for the repurposing brief flow (acceptance criterion 3).
  INSERT INTO activities (organization_id, audience_segment_id, campaign_id, title, source_type)
  VALUES
    (dev_org, seg_founders, camp_founders, 'Founder stories batch', 'manual'),
    (dev_org, seg_sme, NULL, 'SME webinar series', 'manual')
  ON CONFLICT DO NOTHING;
END $$;
