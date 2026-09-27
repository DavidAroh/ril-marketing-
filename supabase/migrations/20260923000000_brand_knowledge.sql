-- RIL Brand Knowledge Base (§§6.23, 7, 8): approved, organization-scoped
-- guidance that grounds AI drafts without treating retrieved copy as source facts.

CREATE TABLE IF NOT EXISTS brand_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'approved_message',
  title text NOT NULL,
  content text NOT NULL,
  source_url text,
  is_active boolean NOT NULL DEFAULT true,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || content)
  ) STORED,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_knowledge_category_valid CHECK (
    category IN (
      'brand_voice', 'organization', 'program', 'audience',
      'approved_message', 'terminology', 'policy', 'asset'
    )
  ),
  CONSTRAINT brand_knowledge_title_not_blank CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT brand_knowledge_content_not_blank CHECK (char_length(btrim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS brand_knowledge_org_idx
  ON brand_knowledge(organization_id, is_active, category);
CREATE INDEX IF NOT EXISTS brand_knowledge_search_idx
  ON brand_knowledge USING gin(search_vector);

ALTER TABLE brand_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_knowledge_isolation ON brand_knowledge;
CREATE POLICY brand_knowledge_isolation ON brand_knowledge FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP TRIGGER IF EXISTS brand_knowledge_updated_at ON brand_knowledge;
CREATE TRIGGER brand_knowledge_updated_at
  BEFORE UPDATE ON brand_knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
