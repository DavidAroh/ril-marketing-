CREATE TABLE IF NOT EXISTS activity_media_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES activity_attachments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  model text NOT NULL DEFAULT '',
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_asset_ids uuid[] NOT NULL DEFAULT '{}',
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_media_analysis_attachment_unique UNIQUE (attachment_id)
);
CREATE INDEX IF NOT EXISTS activity_media_analyses_org_activity_idx ON activity_media_analyses(organization_id, activity_id, created_at DESC);
DROP TRIGGER IF EXISTS activity_media_analyses_updated_at ON activity_media_analyses;
CREATE TRIGGER activity_media_analyses_updated_at BEFORE UPDATE ON activity_media_analyses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE activity_media_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_media_analyses_isolation ON activity_media_analyses;
CREATE POLICY activity_media_analyses_isolation ON activity_media_analyses FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
