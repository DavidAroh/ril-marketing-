CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 180),
  due_at date,
  outcome text,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (outcome IS NULL OR char_length(outcome) <= 2000)
);
CREATE INDEX IF NOT EXISTS lead_follow_ups_org_due_idx ON lead_follow_ups(organization_id, completed_at, due_at);
CREATE INDEX IF NOT EXISTS lead_follow_ups_lead_idx ON lead_follow_ups(lead_id, created_at DESC);
ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_follow_ups_isolation ON lead_follow_ups;
CREATE POLICY lead_follow_ups_isolation ON lead_follow_ups FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));
