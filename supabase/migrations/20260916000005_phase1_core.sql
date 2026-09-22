-- Phase 1 core (PRD §§6.2–6.11, 6.13–6.16, 6.25): activities detail,
-- content lifecycle, AI generation traceability, asset approvals, CRM fields,
-- trends inbox, integrations registry.

-- ============ ACTIVITIES DETAIL (§6.2) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='event_date') THEN
    ALTER TABLE activities ADD COLUMN event_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='description') THEN
    ALTER TABLE activities ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='speakers') THEN
    ALTER TABLE activities ADD COLUMN speakers text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='partners') THEN
    ALTER TABLE activities ADD COLUMN partners text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='outcomes') THEN
    ALTER TABLE activities ADD COLUMN outcomes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='registration_url') THEN
    ALTER TABLE activities ADD COLUMN registration_url text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS activities_event_date_idx ON activities(event_date DESC);

-- ============ AI GENERATIONS (§7, §8 traceability) ============
CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  kind text NOT NULL,
  model text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generations_org_idx ON ai_generations(organization_id);
CREATE INDEX IF NOT EXISTS ai_generations_activity_idx ON ai_generations(activity_id);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_generations_isolation ON ai_generations;
CREATE POLICY ai_generations_isolation ON ai_generations FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ CONTENT ASSET LIFECYCLE (§§6.3–6.10, 6.25) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='body') THEN
    ALTER TABLE content_assets ADD COLUMN body text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='channel') THEN
    ALTER TABLE content_assets ADD COLUMN channel text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='metadata') THEN
    ALTER TABLE content_assets ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='scheduled_for') THEN
    ALTER TABLE content_assets ADD COLUMN scheduled_for timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='published_at') THEN
    ALTER TABLE content_assets ADD COLUMN published_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='source_activity_id') THEN
    ALTER TABLE content_assets ADD COLUMN source_activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='generation_id') THEN
    ALTER TABLE content_assets ADD COLUMN generation_id uuid REFERENCES ai_generations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_assets' AND column_name='sensitivity') THEN
    ALTER TABLE content_assets ADD COLUMN sensitivity text NOT NULL DEFAULT 'standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_assets_sensitivity_valid') THEN
    ALTER TABLE content_assets
      ADD CONSTRAINT content_assets_sensitivity_valid
      CHECK (sensitivity IN ('standard', 'high'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS content_assets_status_idx ON content_assets(status);
CREATE INDEX IF NOT EXISTS content_assets_scheduled_idx ON content_assets(scheduled_for);
CREATE INDEX IF NOT EXISTS content_assets_activity_idx ON content_assets(source_activity_id);

-- ============ ASSET APPROVALS (§7 Approval, §11 tiers) ============
CREATE TABLE IF NOT EXISTS asset_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_approvals_asset_idx
  ON asset_approvals(content_asset_id, created_at DESC);

ALTER TABLE asset_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_approvals_isolation ON asset_approvals;
CREATE POLICY asset_approvals_isolation ON asset_approvals FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ LEAD CRM FIELDS (§6.14, §6.15) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='name') THEN
    ALTER TABLE leads ADD COLUMN name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='phone') THEN
    ALTER TABLE leads ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='organisation') THEN
    ALTER TABLE leads ADD COLUMN organisation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='interest') THEN
    ALTER TABLE leads ADD COLUMN interest text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='funnel_stage') THEN
    ALTER TABLE leads ADD COLUMN funnel_stage text NOT NULL DEFAULT 'captured';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_funnel_stage_valid') THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_funnel_stage_valid
      CHECK (funnel_stage IN ('awareness','engagement','captured','nurturing','converted','retention'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='owner_id') THEN
    ALTER TABLE leads ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='notes') THEN
    ALTER TABLE leads ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='score') THEN
    ALTER TABLE leads ADD COLUMN score text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='score_reason') THEN
    ALTER TABLE leads ADD COLUMN score_reason text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(organization_id, funnel_stage);
CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads(owner_id) WHERE owner_id IS NOT NULL;

-- ============ TRENDS INBOX (§6.12 manual intake; monitoring is Phase 2) ============
CREATE TABLE IF NOT EXISTS trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  source text,
  source_url text,
  relevance text,
  angle text,
  audience text,
  risk text,
  status text NOT NULL DEFAULT 'new',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trends_title_not_blank CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT trends_status_valid CHECK (status IN ('new', 'approved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS trends_org_status_idx ON trends(organization_id, status);

ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trends_isolation ON trends;
CREATE POLICY trends_isolation ON trends FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ INTEGRATIONS REGISTRY (§10) ============
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integrations_key_unique UNIQUE (organization_id, key),
  CONSTRAINT integrations_status_valid CHECK (status IN ('not_connected', 'connected', 'error'))
);

CREATE INDEX IF NOT EXISTS integrations_org_idx ON integrations(organization_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integrations_isolation ON integrations;
CREATE POLICY integrations_isolation ON integrations FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP TRIGGER IF EXISTS integrations_updated_at ON integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
