-- RIL Audience Intelligence & Learning Layer v1
-- Migration: audience segments, insights, generation runs + entity extensions
-- Reversible with `supabase migration repair` / down script below (drop in reverse order).

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE insight_category AS ENUM (
    'TOPIC_ENGAGEMENT',
    'FORMAT_REGISTRATION',
    'PLATFORM_LEAD_QUALITY',
    'HOOK_CTA_EFFECTIVENESS',
    'PROGRAM_AFFINITY',
    'FUNNEL_DROPOFF',
    'REPEAT_ENGAGEMENT',
    'THEME_TREND'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE insight_status AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'SUPPRESSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE signal_strength AS ENUM (
    'EMERGING',
    'STABLE',
    'RISING',
    'DECLINING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE generation_run_status AS ENUM (
    'RUNNING',
    'COMPLETED',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ ORG / MEMBERSHIP SCAFFOLD ============
-- If the larger RIL platform already provides organizations/profiles, these
-- CREATE TABLE IF NOT EXISTS blocks are no-ops for existing tables. They exist
-- so this module is installable standalone.
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- ============ PROGRAMS SCAFFOLD ============
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ANALYTICS / LEAD / CONTENT SCAFFOLD ============
-- Same standalone-installable approach: only created when the wider platform
-- tables do not already exist. Generation jobs read from these shapes.
CREATE TABLE IF NOT EXISTS content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text,
  format text,
  platform text,
  hook text,
  cta text,
  audience_segment_id uuid,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  registrations integer NOT NULL DEFAULT 0,
  avg_time_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text,
  audience_segment_id uuid,
  source_platform text,
  source_content_asset_id uuid REFERENCES content_assets(id) ON DELETE SET NULL,
  is_qualified boolean NOT NULL DEFAULT false,
  is_converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  content_asset_id uuid REFERENCES content_assets(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  audience_segment_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ENTITY EXTENSIONS (§7) ============
-- Add audience_segment_id to pre-existing tables when missing.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'audience_segment_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN audience_segment_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'audience_segment_id'
  ) THEN
    ALTER TABLE content_assets ADD COLUMN audience_segment_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'hook'
  ) THEN
    ALTER TABLE content_assets ADD COLUMN hook text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'cta'
  ) THEN
    ALTER TABLE content_assets ADD COLUMN cta text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'topic'
  ) THEN
    ALTER TABLE content_assets ADD COLUMN topic text;
  END IF;
END $$;

-- Multi-segment targeting for content assets (§7 alternative).
CREATE TABLE IF NOT EXISTS content_asset_segments (
  content_asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  audience_segment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_asset_id, audience_segment_id)
);

-- ============ AUDIENCE SEGMENTS (§6) ============
CREATE TABLE IF NOT EXISTS audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  needs_motivations text[] NOT NULL DEFAULT '{}',
  preferred_formats text[] NOT NULL DEFAULT '{}',
  preferred_platforms text[] NOT NULL DEFAULT '{}',
  preferred_hooks text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audience_segments_name_not_blank CHECK (char_length(btrim(name)) > 0)
);

-- Segment <-> Programs (§6: never duplicate Program records).
CREATE TABLE IF NOT EXISTS audience_segment_programs (
  audience_segment_id uuid NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (audience_segment_id, program_id)
);

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_audience_segment_fk;
ALTER TABLE leads
  ADD CONSTRAINT leads_audience_segment_fk
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id) ON DELETE SET NULL;

ALTER TABLE content_assets
  DROP CONSTRAINT IF EXISTS content_assets_audience_segment_fk;
ALTER TABLE content_assets
  ADD CONSTRAINT content_assets_audience_segment_fk
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id) ON DELETE SET NULL;

ALTER TABLE content_asset_segments
  DROP CONSTRAINT IF EXISTS content_asset_segments_segment_fk;
ALTER TABLE content_asset_segments
  ADD CONSTRAINT content_asset_segments_segment_fk
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id) ON DELETE CASCADE;

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_audience_segment_fk;
ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_audience_segment_fk
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id) ON DELETE SET NULL;

-- ============ GENERATION RUNS (§11) ============
CREATE TABLE IF NOT EXISTS audience_insight_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status generation_run_status NOT NULL DEFAULT 'RUNNING',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  date_range_start date,
  date_range_end date,
  segments_processed integer NOT NULL DEFAULT 0,
  insights_created integer NOT NULL DEFAULT 0,
  algorithm_version text NOT NULL DEFAULT 'v1.0.0',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ AUDIENCE INSIGHTS (§8) ============
CREATE TABLE IF NOT EXISTS audience_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  segment_id uuid NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  category insight_category NOT NULL,
  topic text,
  format text,
  platform text,
  hook text,
  cta text,
  confidence_score numeric NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  signal_strength signal_strength NOT NULL DEFAULT 'STABLE',
  status insight_status NOT NULL DEFAULT 'PENDING_REVIEW',
  summary text NOT NULL,
  recommendation text NOT NULL DEFAULT '',
  sample_size integer NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  date_range_start date,
  date_range_end date,
  source_event_ids uuid[] NOT NULL DEFAULT '{}',
  source_content_asset_ids uuid[] NOT NULL DEFAULT '{}',
  source_lead_ids uuid[] NOT NULL DEFAULT '{}',
  generation_run_id uuid REFERENCES audience_insight_generation_runs(id) ON DELETE SET NULL,
  algorithm_version text NOT NULL DEFAULT 'v1.0.0',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  suppressed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppressed_requires_reason CHECK (
    status <> 'SUPPRESSED' OR (suppression_reason IS NOT NULL AND char_length(btrim(suppression_reason)) > 0)
  )
);

-- Deduplication support (§20): one live insight per identity key.
CREATE UNIQUE INDEX IF NOT EXISTS audience_insights_identity_uidx
  ON audience_insights (
    organization_id, segment_id, category,
    COALESCE(topic, ''), COALESCE(format, ''), COALESCE(platform, ''),
    COALESCE(hook, ''), COALESCE(cta, '')
  )
  WHERE status IN ('PENDING_REVIEW', 'APPROVED');

-- ============ INDEXES (§43) ============
CREATE INDEX IF NOT EXISTS audience_segments_org_idx ON audience_segments(organization_id);
CREATE INDEX IF NOT EXISTS audience_segment_programs_segment_idx ON audience_segment_programs(audience_segment_id);
CREATE INDEX IF NOT EXISTS audience_segment_programs_program_idx ON audience_segment_programs(program_id);
CREATE INDEX IF NOT EXISTS audience_insights_org_idx ON audience_insights(organization_id);
CREATE INDEX IF NOT EXISTS audience_insights_segment_idx ON audience_insights(segment_id);
CREATE INDEX IF NOT EXISTS audience_insights_category_idx ON audience_insights(category);
CREATE INDEX IF NOT EXISTS audience_insights_status_idx ON audience_insights(status);
CREATE INDEX IF NOT EXISTS audience_insights_created_idx ON audience_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS audience_insights_daterange_end_idx ON audience_insights(date_range_end DESC);
CREATE INDEX IF NOT EXISTS audience_insights_status_confidence_idx
  ON audience_insights(status, confidence_score DESC) WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS audience_insights_segment_status_idx
  ON audience_insights(segment_id, status);
CREATE INDEX IF NOT EXISTS generation_runs_org_idx
  ON audience_insight_generation_runs(organization_id);
CREATE INDEX IF NOT EXISTS generation_runs_created_idx
  ON audience_insight_generation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS content_assets_org_topic_idx ON content_assets(organization_id, topic);
CREATE INDEX IF NOT EXISTS content_assets_org_format_idx ON content_assets(organization_id, format);
CREATE INDEX IF NOT EXISTS content_assets_segment_idx ON content_assets(audience_segment_id);
CREATE INDEX IF NOT EXISTS leads_org_segment_idx ON leads(organization_id, audience_segment_id);
CREATE INDEX IF NOT EXISTS leads_source_asset_idx ON leads(source_content_asset_id);
CREATE INDEX IF NOT EXISTS analytics_events_org_created_idx
  ON analytics_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_asset_idx ON analytics_events(content_asset_id);
CREATE INDEX IF NOT EXISTS programs_org_idx ON programs(organization_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audience_segments_updated_at ON audience_segments;
CREATE TRIGGER audience_segments_updated_at
  BEFORE UPDATE ON audience_segments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS audience_insights_updated_at ON audience_insights;
CREATE TRIGGER audience_insights_updated_at
  BEFORE UPDATE ON audience_insights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ RLS (§5, §32) ============
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_asset_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segment_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_insight_generation_runs ENABLE ROW LEVEL SECURITY;

-- Helper: caller's organizations
CREATE OR REPLACE FUNCTION caller_organization_ids() RETURNS SETOF uuid AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  UNION
  SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Generic org-isolation policies (drop-then-create for idempotency)
DROP POLICY IF EXISTS org_isolation_select ON organizations;
CREATE POLICY org_isolation_select ON organizations FOR SELECT
  USING (id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS profiles_self ON profiles;
CREATE POLICY profiles_self ON profiles FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS members_self_read ON organization_members;
CREATE POLICY members_self_read ON organization_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS programs_isolation ON programs;
CREATE POLICY programs_isolation ON programs FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS content_assets_isolation ON content_assets;
CREATE POLICY content_assets_isolation ON content_assets FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS content_asset_segments_isolation ON content_asset_segments;
CREATE POLICY content_asset_segments_isolation ON content_asset_segments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_assets ca
      WHERE ca.id = content_asset_segments.content_asset_id
        AND ca.organization_id IN (SELECT caller_organization_ids())
    )
  );

DROP POLICY IF EXISTS leads_isolation ON leads;
CREATE POLICY leads_isolation ON leads FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS analytics_events_isolation ON analytics_events;
CREATE POLICY analytics_events_isolation ON analytics_events FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS segments_isolation ON audience_segments;
CREATE POLICY segments_isolation ON audience_segments FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS segment_programs_isolation ON audience_segment_programs;
CREATE POLICY segment_programs_isolation ON audience_segment_programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM audience_segments s
      WHERE s.id = audience_segment_programs.audience_segment_id
        AND s.organization_id IN (SELECT caller_organization_ids())
    )
  );

-- §10: RLS cannot filter "approved only" globally (reviewers need to see
-- pending/suppressed), so the status gate is enforced in the recommendation
-- service + API (status = 'APPROVED'). This policy keeps org isolation.
DROP POLICY IF EXISTS insights_isolation ON audience_insights;
CREATE POLICY insights_isolation ON audience_insights FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS runs_isolation ON audience_insight_generation_runs;
CREATE POLICY runs_isolation ON audience_insight_generation_runs FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
