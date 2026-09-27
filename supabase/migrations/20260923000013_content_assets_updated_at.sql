-- content_assets.updated_at: the SEO workspace orders its editorial queue by
-- last-touched, but the table never grew an updated_at column.
ALTER TABLE content_assets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS content_assets_updated_at ON content_assets;
CREATE TRIGGER content_assets_updated_at BEFORE UPDATE ON content_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
