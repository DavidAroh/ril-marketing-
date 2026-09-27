CREATE TABLE IF NOT EXISTS trend_monitoring_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trend_monitoring_settings_updated_at ON trend_monitoring_settings;
CREATE TRIGGER trend_monitoring_settings_updated_at BEFORE UPDATE ON trend_monitoring_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE trend_monitoring_settings ENABLE ROW LEVEL SECURITY;
-- Source review and monitor controls are role-gated in the database as well
-- as in server actions, so direct client requests cannot bypass the UI.
DROP POLICY IF EXISTS trend_monitoring_settings_isolation ON trend_monitoring_settings;
DROP POLICY IF EXISTS trend_monitoring_settings_read ON trend_monitoring_settings;
DROP POLICY IF EXISTS trend_monitoring_settings_manager_write ON trend_monitoring_settings;
CREATE POLICY trend_monitoring_settings_read ON trend_monitoring_settings FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY trend_monitoring_settings_manager_write ON trend_monitoring_settings FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = trend_monitoring_settings.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = trend_monitoring_settings.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ));

ALTER TABLE trends ADD COLUMN IF NOT EXISTS source_item_id text;
ALTER TABLE trends ADD COLUMN IF NOT EXISTS source_published_at timestamptz;
ALTER TABLE trends ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE trends ADD COLUMN IF NOT EXISTS analysis_status text NOT NULL DEFAULT 'manual'
  CHECK (analysis_status IN ('manual', 'analysed', 'unanalysed', 'failed'));
CREATE UNIQUE INDEX IF NOT EXISTS trends_org_source_item_unique
  ON trends(organization_id, source_item_id);
CREATE INDEX IF NOT EXISTS trends_org_published_idx ON trends(organization_id, source_published_at DESC);

DROP POLICY IF EXISTS trends_isolation ON trends;
DROP POLICY IF EXISTS trends_read_org ON trends;
DROP POLICY IF EXISTS trends_insert_org ON trends;
DROP POLICY IF EXISTS trends_update_reviewer ON trends;
CREATE POLICY trends_read_org ON trends FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY trends_insert_org ON trends FOR INSERT
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY trends_update_reviewer ON trends FOR UPDATE
  USING (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = trends.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager', 'leadership')
  ))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = trends.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager', 'leadership')
  ));
