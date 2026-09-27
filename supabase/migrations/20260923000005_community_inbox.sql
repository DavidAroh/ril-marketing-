CREATE TABLE IF NOT EXISTS community_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_url text,
  author_label text NOT NULL DEFAULT '',
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'question', 'lead', 'complaint', 'praise', 'partnership', 'spam', 'reputational_risk')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  reply_draft text NOT NULL DEFAULT '',
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'reply_approved', 'replied', 'ignored')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_model text NOT NULL DEFAULT 'rules-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz,
  CHECK (char_length(btrim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS community_items_org_status_idx ON community_items(organization_id, status, created_at DESC);
DROP TRIGGER IF EXISTS community_items_updated_at ON community_items;
CREATE TRIGGER community_items_updated_at BEFORE UPDATE ON community_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE community_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_items_isolation ON community_items;
CREATE POLICY community_items_isolation ON community_items FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

-- Atomically turn a comment classified as a lead into a CRM record. It is
-- intentionally not marked as marketing-consented because a public comment
-- does not grant permission for email marketing.
CREATE OR REPLACE FUNCTION community_item_create_lead(p_community_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item community_items%ROWTYPE; new_lead_id uuid;
BEGIN
  SELECT * INTO item FROM community_items
    WHERE id = p_community_id
      AND organization_id IN (SELECT caller_organization_ids())
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Community item not found'; END IF;
  IF item.category <> 'lead' THEN RAISE EXCEPTION 'Only items classified as leads can be added to CRM'; END IF;
  IF item.lead_id IS NOT NULL THEN RETURN item.lead_id; END IF;
  INSERT INTO leads (organization_id, name, interest, source_platform, funnel_stage, marketing_consent)
    VALUES (item.organization_id, NULLIF(item.author_label, ''), item.body, item.platform, 'captured', false)
    RETURNING id INTO new_lead_id;
  UPDATE community_items SET lead_id = new_lead_id WHERE id = p_community_id;
  RETURN new_lead_id;
END;
$$;
REVOKE ALL ON FUNCTION community_item_create_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION community_item_create_lead(uuid) TO authenticated;
