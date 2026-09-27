-- Email campaign drafts and human approval state. Delivery is enabled only after
-- a verified provider integration is configured.
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  audience_segment_id uuid REFERENCES audience_segments(id) ON DELETE SET NULL,
  name text NOT NULL,
  subject text NOT NULL,
  preview_text text NOT NULL DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_campaigns_status_valid CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'sent', 'paused')),
  CONSTRAINT email_campaigns_name_nonblank CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT email_campaigns_subject_nonblank CHECK (char_length(btrim(subject)) > 0),
  CONSTRAINT email_campaigns_body_nonblank CHECK (char_length(btrim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS email_campaigns_org_status_idx ON email_campaigns(organization_id, status, created_at DESC);
DROP TRIGGER IF EXISTS email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_campaigns_isolation ON email_campaigns;
CREATE POLICY email_campaigns_isolation ON email_campaigns FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
