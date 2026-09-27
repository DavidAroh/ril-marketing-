ALTER TABLE marketing_reports
  ADD COLUMN IF NOT EXISTS generated_by_schedule boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_reports_scheduled_period_unique
  ON marketing_reports (organization_id, period_type, period_start, period_end)
  WHERE generated_by_schedule = true;

CREATE TABLE IF NOT EXISTS report_schedule_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  frequency text CHECK (frequency IN ('weekly', 'monthly')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_schedule_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_schedule_settings_isolation ON report_schedule_settings;
CREATE POLICY report_schedule_settings_isolation ON report_schedule_settings FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
