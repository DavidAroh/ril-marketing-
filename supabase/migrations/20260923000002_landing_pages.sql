-- Campaign landing pages and first-party source attribution.

CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  audience_segment_id uuid REFERENCES audience_segments(id) ON DELETE SET NULL,
  slug text NOT NULL,
  title text NOT NULL,
  headline text NOT NULL,
  body text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Register interest',
  registration_url text,
  meta_description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_pages_slug_valid CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT landing_pages_title_nonblank CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT landing_pages_headline_nonblank CHECK (char_length(btrim(headline)) > 0),
  CONSTRAINT landing_pages_cta_nonblank CHECK (char_length(btrim(cta_label)) > 0),
  CONSTRAINT landing_pages_status_valid CHECK (status IN ('draft', 'review', 'approved', 'published', 'paused'))
);

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_org_slug_idx ON landing_pages(organization_id, slug);
CREATE INDEX IF NOT EXISTS landing_pages_org_status_idx ON landing_pages(organization_id, status);
DROP TRIGGER IF EXISTS landing_pages_updated_at ON landing_pages;
CREATE TRIGGER landing_pages_updated_at BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landing_pages_isolation ON landing_pages;
CREATE POLICY landing_pages_isolation ON landing_pages FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page_id uuid REFERENCES landing_pages(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
CREATE INDEX IF NOT EXISTS leads_campaign_idx ON leads(organization_id, campaign_id);
CREATE INDEX IF NOT EXISTS leads_landing_page_idx ON leads(organization_id, landing_page_id);
