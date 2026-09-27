CREATE TABLE IF NOT EXISTS automation_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  activity_to_drafts_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS automation_settings_updated_at ON automation_settings;
CREATE TRIGGER automation_settings_updated_at BEFORE UPDATE ON automation_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS automation_settings_isolation ON automation_settings;
CREATE POLICY automation_settings_isolation ON automation_settings FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

CREATE TABLE IF NOT EXISTS automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('activity_created', 'lead_captured')),
  record_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'deferred')),
  attempts integer NOT NULL DEFAULT 0,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (organization_id, event_type, record_id)
);
CREATE INDEX IF NOT EXISTS automation_events_queue_idx ON automation_events(status, created_at) WHERE status IN ('queued', 'failed');
ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS automation_events_read_isolation ON automation_events;
CREATE POLICY automation_events_read_isolation ON automation_events FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION enqueue_ril_marketing_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_type text; v_org_id uuid; v_record_id uuid;
BEGIN
  v_org_id := NEW.organization_id;
  v_record_id := NEW.id;
  IF TG_TABLE_NAME = 'activities' THEN v_event_type := 'activity_created';
  ELSIF TG_TABLE_NAME = 'leads' THEN v_event_type := 'lead_captured';
  ELSE RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM automation_settings s
    WHERE s.organization_id = v_org_id AND s.activity_to_drafts_enabled = true
  ) THEN
    INSERT INTO automation_events (organization_id, event_type, record_id)
      VALUES (v_org_id, v_event_type, v_record_id)
      ON CONFLICT (organization_id, event_type, record_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS activities_enqueue_marketing_automation ON activities;
CREATE TRIGGER activities_enqueue_marketing_automation AFTER INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION enqueue_ril_marketing_event();
DROP TRIGGER IF EXISTS leads_enqueue_marketing_automation ON leads;
CREATE TRIGGER leads_enqueue_marketing_automation AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION enqueue_ril_marketing_event();
