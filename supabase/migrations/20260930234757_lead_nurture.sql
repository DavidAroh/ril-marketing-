-- Automated lead nurture: opt-in, human-approved drip sequences that reuse the
-- existing email delivery, consent and unsubscribe machinery. Nothing sends
-- without an active, separately-approved sequence and a live consent recheck at
-- each step. Enrolment rides the shared marketing-automation queue
-- (lead_captured events), so this migration also teaches the enqueue trigger to
-- fire for nurture independently of the activity-to-drafts toggle.

-- 1. Opt-in switch (mirrors automation_settings). Split RLS: members read,
--    only owner/admin/marketing_manager may flip the opt-in.
CREATE TABLE IF NOT EXISTS nurture_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  lead_capture_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS nurture_settings_updated_at ON nurture_settings;
CREATE TRIGGER nurture_settings_updated_at BEFORE UPDATE ON nurture_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE nurture_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nurture_settings_read ON nurture_settings;
DROP POLICY IF EXISTS nurture_settings_manager_write ON nurture_settings;
CREATE POLICY nurture_settings_read ON nurture_settings FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY nurture_settings_manager_write ON nurture_settings FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_settings.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_settings.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ));

-- 2. Sequences. Reviewer-gated: members read, managers write.
CREATE TABLE IF NOT EXISTS nurture_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger text NOT NULL DEFAULT 'lead_captured' CHECK (trigger IN ('lead_captured', 'manual')),
  audience_segment_id uuid REFERENCES audience_segments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nurture_sequences_name_nonblank CHECK (char_length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS nurture_sequences_org_status_idx ON nurture_sequences(organization_id, status, created_at DESC);
DROP TRIGGER IF EXISTS nurture_sequences_updated_at ON nurture_sequences;
CREATE TRIGGER nurture_sequences_updated_at BEFORE UPDATE ON nurture_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE nurture_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nurture_sequences_read ON nurture_sequences;
DROP POLICY IF EXISTS nurture_sequences_manager_write ON nurture_sequences;
CREATE POLICY nurture_sequences_read ON nurture_sequences FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY nurture_sequences_manager_write ON nurture_sequences FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_sequences.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_sequences.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ));

-- 3. Steps (the drip content). Same reviewer gate as sequences.
CREATE TABLE IF NOT EXISTS nurture_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL CHECK (step_order >= 1),
  delay_hours integer NOT NULL DEFAULT 24 CHECK (delay_hours >= 0 AND delay_hours <= 8760),
  email_subject text NOT NULL,
  email_body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_order),
  CONSTRAINT nurture_steps_subject_nonblank CHECK (char_length(btrim(email_subject)) > 0),
  CONSTRAINT nurture_steps_body_nonblank CHECK (char_length(btrim(email_body)) > 0)
);
CREATE INDEX IF NOT EXISTS nurture_steps_sequence_idx ON nurture_steps(sequence_id, step_order);
ALTER TABLE nurture_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nurture_steps_read ON nurture_steps;
DROP POLICY IF EXISTS nurture_steps_manager_write ON nurture_steps;
CREATE POLICY nurture_steps_read ON nurture_steps FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));
CREATE POLICY nurture_steps_manager_write ON nurture_steps FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_steps.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()) AND EXISTS (
    SELECT 1 FROM organization_members m WHERE m.organization_id = nurture_steps.organization_id
      AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'marketing_manager')
  ));

-- 4. Enrolments (per-lead cursor). Tamper-resistant like automation_events and
--    email_campaign_deliveries: members read, all writes go through the worker
--    or reviewer actions on the service-role client, never a raw client request.
CREATE TABLE IF NOT EXISTS nurture_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'suppressed')),
  current_step integer NOT NULL DEFAULT 1,
  next_run_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, lead_id)
);
CREATE INDEX IF NOT EXISTS nurture_enrollments_due_idx ON nurture_enrollments(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS nurture_enrollments_lead_idx ON nurture_enrollments(organization_id, lead_id);
DROP TRIGGER IF EXISTS nurture_enrollments_updated_at ON nurture_enrollments;
CREATE TRIGGER nurture_enrollments_updated_at BEFORE UPDATE ON nurture_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE nurture_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nurture_enrollments_read ON nurture_enrollments;
CREATE POLICY nurture_enrollments_read ON nurture_enrollments FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));

-- 5. Teach the shared enqueue trigger to fire lead_captured for nurture too.
--    Activity automation keeps its existing gate; lead events now enqueue when
--    EITHER activity-to-drafts OR lead nurture is enabled. The worker decides
--    what a lead_captured event means (enrol vs defer) from nurture_settings.
CREATE OR REPLACE FUNCTION enqueue_ril_marketing_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_type text; v_org_id uuid; v_record_id uuid; v_enqueue boolean := false;
BEGIN
  v_org_id := NEW.organization_id;
  v_record_id := NEW.id;
  IF TG_TABLE_NAME = 'activities' THEN
    v_event_type := 'activity_created';
    SELECT EXISTS (SELECT 1 FROM automation_settings s
      WHERE s.organization_id = v_org_id AND s.activity_to_drafts_enabled = true) INTO v_enqueue;
  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_event_type := 'lead_captured';
    SELECT EXISTS (SELECT 1 FROM automation_settings s
        WHERE s.organization_id = v_org_id AND s.activity_to_drafts_enabled = true)
      OR EXISTS (SELECT 1 FROM nurture_settings n
        WHERE n.organization_id = v_org_id AND n.lead_capture_enabled = true) INTO v_enqueue;
  ELSE
    RETURN NEW;
  END IF;
  IF v_enqueue THEN
    INSERT INTO automation_events (organization_id, event_type, record_id)
      VALUES (v_org_id, v_event_type, v_record_id)
      ON CONFLICT (organization_id, event_type, record_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
