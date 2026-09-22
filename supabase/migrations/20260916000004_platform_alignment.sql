-- Platform alignment for the Audience Intelligence layer (PRD §7, §11, §14, §16):
-- Approval audit trail, Command-Centre tasks, KPIs, member roles,
-- content-asset pipeline status, registration-link attribution seam.

-- ============ MEMBER ROLES (§4, §12) ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_role_valid'
  ) THEN
    ALTER TABLE organization_members
      ADD CONSTRAINT organization_members_role_valid
      CHECK (role IN ('owner', 'admin', 'marketing_manager', 'leadership', 'member'));
  END IF;
END $$;

-- ============ APPROVAL AUDIT TRAIL (§7 Approval, §16) ============
CREATE TABLE IF NOT EXISTS insight_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_id uuid NOT NULL REFERENCES audience_insights(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status insight_status NOT NULL,
  to_status insight_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insight_approvals_insight_idx
  ON insight_approvals(insight_id, created_at DESC);
CREATE INDEX IF NOT EXISTS insight_approvals_org_idx
  ON insight_approvals(organization_id);

ALTER TABLE insight_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_isolation ON insight_approvals;
CREATE POLICY approvals_isolation ON insight_approvals FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ TASKS (§7 Task, §6.1 "tasks needing attention") ============
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'insight_review',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  insight_id uuid REFERENCES audience_insights(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT tasks_status_valid CHECK (status IN ('open', 'done')),
  CONSTRAINT tasks_title_not_blank CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS tasks_org_status_idx
  ON tasks(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_insight_idx ON tasks(insight_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_isolation ON tasks;
CREATE POLICY tasks_isolation ON tasks FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ KPIS (§7 KPI, §14 targets) ============
CREATE TABLE IF NOT EXISTS kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric text,
  target_value numeric NOT NULL CHECK (target_value >= 0),
  unit text NOT NULL DEFAULT 'count',
  period text NOT NULL DEFAULT 'annual',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kpis_name_not_blank CHECK (char_length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS kpis_org_idx ON kpis(organization_id);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpis_isolation ON kpis;
CREATE POLICY kpis_isolation ON kpis FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- Seed the PRD §14 operating targets for every newly bootstrapped org.
CREATE OR REPLACE FUNCTION create_organization_with_owner(org_name text)
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF char_length(btrim(COALESCE(org_name, ''))) < 2
     OR char_length(org_name) > 120 THEN
    RAISE EXCEPTION 'Invalid organization name' USING ERRCODE = '22000';
  END IF;

  INSERT INTO organizations (name)
  VALUES (btrim(org_name))
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, caller, 'owner');

  INSERT INTO profiles (id, organization_id)
  VALUES (caller, new_org_id)
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  INSERT INTO kpis (organization_id, name, metric, target_value, unit, period)
  VALUES
    (new_org_id, 'Qualified leads', 'qualified_leads', 1200, 'leads', 'annual'),
    (new_org_id, 'Marketing-generated registrations', 'registrations', 500, 'registrations', 'annual'),
    (new_org_id, 'Lead-to-conversion rate', 'conversion_rate', 10, '%', 'annual'),
    (new_org_id, 'Website traffic growth', NULL, 30, '%', 'annual'),
    (new_org_id, 'Organic traffic growth', NULL, 25, '%', 'annual'),
    (new_org_id, 'Social audience growth', NULL, 30, '%', 'annual'),
    (new_org_id, 'Email database growth', NULL, 25, '%', 'annual'),
    (new_org_id, 'Campaign reporting coverage', NULL, 100, '%', 'per campaign');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ CONTENT ASSET PIPELINE STATUS (§11) ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'status'
  ) THEN
    ALTER TABLE content_assets
      ADD COLUMN status text NOT NULL DEFAULT 'idea';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_assets_status_valid'
  ) THEN
    ALTER TABLE content_assets
      ADD CONSTRAINT content_assets_status_valid
      CHECK (status IN ('idea','ai_generated','editing','review','approved','scheduled','published','analysing'));
  END IF;
END $$;

-- ============ REGISTRATION LINKS (§6.16, §7) ============
CREATE TABLE IF NOT EXISTS registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'direct',
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_links_token_unique UNIQUE (organization_id, token),
  CONSTRAINT registration_links_token_not_blank CHECK (char_length(btrim(token)) > 0)
);

CREATE INDEX IF NOT EXISTS registration_links_token_idx
  ON registration_links(organization_id, token);
CREATE INDEX IF NOT EXISTS registration_links_asset_idx
  ON registration_links(content_asset_id);

ALTER TABLE registration_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS registration_links_isolation ON registration_links;
CREATE POLICY registration_links_isolation ON registration_links FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'registration_token'
  ) THEN
    ALTER TABLE leads ADD COLUMN registration_token text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_registration_token_idx
  ON leads(organization_id, registration_token);
