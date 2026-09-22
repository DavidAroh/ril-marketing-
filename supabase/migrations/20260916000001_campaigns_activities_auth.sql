-- RIL Audience Intelligence v1 — follow-up migration
-- 1. Campaign + Activity entities (PRD §6.18, §6.3, data-model additions)
-- 2. content_assets.campaign_id for campaign rollups
-- 3. Auto-provision profiles row on signup (auth.users trigger)

-- ============ CAMPAIGNS ============
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audience_segment_id uuid REFERENCES audience_segments(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  starts_on date,
  ends_on date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_name_not_blank CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT campaigns_status_valid CHECK (status IN ('draft', 'active', 'paused', 'completed'))
);

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ ACTIVITIES (repurposing source, PRD §6.3) ============
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audience_segment_id uuid REFERENCES audience_segments(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  source_type text,
  source_ref text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activities_title_not_blank CHECK (char_length(btrim(title)) > 0)
);

-- ============ CONTENT ASSET -> CAMPAIGN ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_assets' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE content_assets ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS campaigns_org_idx ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS campaigns_segment_idx ON campaigns(audience_segment_id);
CREATE INDEX IF NOT EXISTS activities_org_idx ON activities(organization_id);
CREATE INDEX IF NOT EXISTS activities_segment_idx ON activities(audience_segment_id);
CREATE INDEX IF NOT EXISTS activities_campaign_idx ON activities(campaign_id);
CREATE INDEX IF NOT EXISTS content_assets_campaign_idx ON content_assets(campaign_id);

-- ============ RLS ============
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_isolation ON campaigns;
CREATE POLICY campaigns_isolation ON campaigns FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS activities_isolation ON activities;
CREATE POLICY activities_isolation ON activities FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- ============ NEW-USER PROFILE PROVISIONING ============
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
