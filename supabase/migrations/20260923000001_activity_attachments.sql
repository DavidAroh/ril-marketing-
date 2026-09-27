-- Private media and document source files linked to RIL activities.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ril-activity-media',
  'ril-activity-media',
  false,
  104857600,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
    'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_attachments_path_unique UNIQUE (storage_path),
  CONSTRAINT activity_attachments_size_valid CHECK (byte_size > 0 AND byte_size <= 104857600),
  CONSTRAINT activity_attachments_path_scoped CHECK (storage_path LIKE organization_id::text || '/' || activity_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS activity_attachments_activity_idx
  ON activity_attachments (organization_id, activity_id, created_at DESC);

ALTER TABLE activity_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_attachments_isolation ON activity_attachments;
CREATE POLICY activity_attachments_isolation ON activity_attachments FOR ALL
  USING (organization_id IN (SELECT caller_organization_ids()))
  WITH CHECK (organization_id IN (SELECT caller_organization_ids()));

DROP POLICY IF EXISTS ril_media_org_read ON storage.objects;
CREATE POLICY ril_media_org_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ril-activity-media'
    AND (storage.foldername(name))[1] IN (SELECT caller_organization_ids()::text)
  );
DROP POLICY IF EXISTS ril_media_org_insert ON storage.objects;
CREATE POLICY ril_media_org_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ril-activity-media'
    AND (storage.foldername(name))[1] IN (SELECT caller_organization_ids()::text)
  );
DROP POLICY IF EXISTS ril_media_org_update ON storage.objects;
CREATE POLICY ril_media_org_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ril-activity-media'
    AND (storage.foldername(name))[1] IN (SELECT caller_organization_ids()::text)
  )
  WITH CHECK (
    bucket_id = 'ril-activity-media'
    AND (storage.foldername(name))[1] IN (SELECT caller_organization_ids()::text)
  );
DROP POLICY IF EXISTS ril_media_org_delete ON storage.objects;
CREATE POLICY ril_media_org_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ril-activity-media'
    AND (storage.foldername(name))[1] IN (SELECT caller_organization_ids()::text)
  );
