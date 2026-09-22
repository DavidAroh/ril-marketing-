-- Publications (§7 Publication, §6.9): a published instance of a Content
-- Asset on a Channel. Publishing tools only act on Approved assets; failures
-- keep the asset Approved with an error on the publication row (§13).

CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text,
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  published_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publications_status_valid
    CHECK (status IN ('queued', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS publications_org_idx ON publications(organization_id);
CREATE INDEX IF NOT EXISTS publications_asset_idx ON publications(content_asset_id);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS publications_isolation ON publications;
CREATE POLICY publications_isolation ON publications FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
