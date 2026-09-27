ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_unsubscribed_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_suppressed_at timestamptz;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS delivery_authorized_at timestamptz;

CREATE TABLE IF NOT EXISTS email_campaign_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','opened','clicked','bounced','complained','failed','unsubscribed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  unsubscribe_token_hash text NOT NULL,
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  first_opened_at timestamptz,
  first_clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_campaign_delivery_recipient_unique UNIQUE (campaign_id, lead_id),
  CONSTRAINT email_campaign_delivery_unsubscribe_unique UNIQUE (unsubscribe_token_hash)
);
CREATE INDEX IF NOT EXISTS email_deliveries_queue_idx ON email_campaign_deliveries(next_attempt_at, created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS email_deliveries_campaign_idx ON email_campaign_deliveries(organization_id, campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS email_deliveries_provider_message_unique ON email_campaign_deliveries(provider_message_id) WHERE provider_message_id IS NOT NULL;
DROP TRIGGER IF EXISTS email_campaign_deliveries_updated_at ON email_campaign_deliveries;
CREATE TRIGGER email_campaign_deliveries_updated_at BEFORE UPDATE ON email_campaign_deliveries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE email_campaign_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_campaign_deliveries_read ON email_campaign_deliveries;
DROP POLICY IF EXISTS email_campaign_deliveries_org_read ON email_campaign_deliveries;
CREATE POLICY email_campaign_deliveries_org_read ON email_campaign_deliveries FOR SELECT
  USING (organization_id IN (SELECT caller_organization_ids()));

CREATE TABLE IF NOT EXISTS email_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_event_id text NOT NULL,
  provider_message_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_provider_event_org_unique UNIQUE (organization_id, provider_event_id)
);
ALTER TABLE email_provider_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION record_resend_email_event(
  p_organization_id uuid,
  p_provider_event_id text,
  p_provider_message_id text,
  p_event_type text,
  p_occurred_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted_count integer; target email_campaign_deliveries%ROWTYPE;
BEGIN
  INSERT INTO email_provider_events(organization_id, provider_event_id, provider_message_id, event_type, occurred_at)
    VALUES (p_organization_id, p_provider_event_id, p_provider_message_id, p_event_type, p_occurred_at)
    ON CONFLICT (organization_id, provider_event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN RETURN false; END IF;

  SELECT * INTO target FROM email_campaign_deliveries
    WHERE organization_id = p_organization_id AND provider_message_id = p_provider_message_id
    FOR UPDATE;
  IF NOT FOUND THEN RETURN true; END IF;

  UPDATE email_campaign_deliveries SET
    status = CASE p_event_type
      WHEN 'email.delivered' THEN CASE WHEN status IN ('opened','clicked','bounced','complained','failed','unsubscribed') THEN status ELSE 'delivered' END
      WHEN 'email.opened' THEN CASE WHEN status IN ('clicked','bounced','complained','failed','unsubscribed') THEN status ELSE 'opened' END
      WHEN 'email.clicked' THEN CASE WHEN status IN ('bounced','complained','failed','unsubscribed') THEN status ELSE 'clicked' END
      WHEN 'email.bounced' THEN 'bounced'
      WHEN 'email.complained' THEN 'complained'
      WHEN 'email.failed' THEN 'failed'
      WHEN 'email.sent' THEN CASE WHEN status IN ('queued','sending') THEN 'sent' ELSE status END
      ELSE status
    END,
    delivered_at = CASE WHEN p_event_type = 'email.delivered' THEN COALESCE(delivered_at, p_occurred_at) ELSE delivered_at END,
    opened_count = opened_count + CASE WHEN p_event_type = 'email.opened' THEN 1 ELSE 0 END,
    clicked_count = clicked_count + CASE WHEN p_event_type = 'email.clicked' THEN 1 ELSE 0 END,
    first_opened_at = CASE WHEN p_event_type = 'email.opened' THEN COALESCE(first_opened_at, p_occurred_at) ELSE first_opened_at END,
    first_clicked_at = CASE WHEN p_event_type = 'email.clicked' THEN COALESCE(first_clicked_at, p_occurred_at) ELSE first_clicked_at END
    WHERE id = target.id;

  IF p_event_type IN ('email.bounced', 'email.complained') THEN
    UPDATE leads SET marketing_consent = false, email_suppressed_at = COALESCE(email_suppressed_at, p_occurred_at)
      WHERE id = target.lead_id AND organization_id = p_organization_id;
  END IF;
  UPDATE email_provider_events SET processed_at = now() WHERE organization_id = p_organization_id AND provider_event_id = p_provider_event_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION record_resend_email_event(uuid, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_resend_email_event(uuid, text, text, text, timestamptz) TO service_role;

-- Webhooks can arrive between provider acceptance and saving the message ID.
-- Keep unmatched events pending and replay them after the sender persists it.
CREATE OR REPLACE FUNCTION replay_resend_email_events(p_organization_id uuid, p_provider_message_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE evt email_provider_events%ROWTYPE; target email_campaign_deliveries%ROWTYPE; replayed integer := 0;
BEGIN
  SELECT * INTO target FROM email_campaign_deliveries
    WHERE organization_id = p_organization_id AND provider_message_id = p_provider_message_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  FOR evt IN SELECT * FROM email_provider_events WHERE organization_id = p_organization_id
    AND provider_message_id = p_provider_message_id AND processed_at IS NULL ORDER BY occurred_at
  LOOP
    UPDATE email_campaign_deliveries SET
      status = CASE evt.event_type
        WHEN 'email.delivered' THEN CASE WHEN status IN ('opened','clicked','bounced','complained','failed','unsubscribed') THEN status ELSE 'delivered' END
        WHEN 'email.opened' THEN CASE WHEN status IN ('clicked','bounced','complained','failed','unsubscribed') THEN status ELSE 'opened' END
        WHEN 'email.clicked' THEN CASE WHEN status IN ('bounced','complained','failed','unsubscribed') THEN status ELSE 'clicked' END
        WHEN 'email.bounced' THEN 'bounced' WHEN 'email.complained' THEN 'complained' WHEN 'email.failed' THEN 'failed'
        WHEN 'email.sent' THEN CASE WHEN status IN ('queued','sending') THEN 'sent' ELSE status END ELSE status END,
      delivered_at = CASE WHEN evt.event_type = 'email.delivered' THEN COALESCE(delivered_at, evt.occurred_at) ELSE delivered_at END,
      opened_count = opened_count + CASE WHEN evt.event_type = 'email.opened' THEN 1 ELSE 0 END,
      clicked_count = clicked_count + CASE WHEN evt.event_type = 'email.clicked' THEN 1 ELSE 0 END,
      first_opened_at = CASE WHEN evt.event_type = 'email.opened' THEN COALESCE(first_opened_at, evt.occurred_at) ELSE first_opened_at END,
      first_clicked_at = CASE WHEN evt.event_type = 'email.clicked' THEN COALESCE(first_clicked_at, evt.occurred_at) ELSE first_clicked_at END
      WHERE id = target.id;
    IF evt.event_type IN ('email.bounced','email.complained') THEN
      UPDATE leads SET marketing_consent = false, email_suppressed_at = COALESCE(email_suppressed_at, evt.occurred_at)
        WHERE id = target.lead_id AND organization_id = p_organization_id;
    END IF;
    UPDATE email_provider_events SET processed_at = now() WHERE id = evt.id;
    replayed := replayed + 1;
  END LOOP;
  RETURN replayed;
END;
$$;
REVOKE ALL ON FUNCTION replay_resend_email_events(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replay_resend_email_events(uuid, text) TO service_role;
