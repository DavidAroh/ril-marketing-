CREATE TABLE IF NOT EXISTS marketing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative text NOT NULL,
  model text NOT NULL DEFAULT 'workspace-summary',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK (period_end >= period_start),
  CHECK (char_length(btrim(narrative)) > 0)
);
CREATE INDEX IF NOT EXISTS marketing_reports_org_period_idx ON marketing_reports(organization_id, period_end DESC);
ALTER TABLE marketing_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_reports_isolation ON marketing_reports;
CREATE POLICY marketing_reports_isolation ON marketing_reports FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
