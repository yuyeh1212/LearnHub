-- Adds provider-neutral private content metadata while keeping legacy URLs
-- available during the expand-and-contract rollout.

BEGIN;

CREATE TABLE content_assets (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  media_type text NOT NULL,
  original_file_name text NOT NULL,
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_assets_storage_key_not_blank CHECK (length(btrim(storage_key)) > 0),
  CONSTRAINT content_assets_storage_key_is_relative CHECK (
    left(storage_key, 1) <> '/'
    AND position('..' IN storage_key) = 0
    AND storage_key NOT LIKE E'%\\\\%'
  ),
  CONSTRAINT content_assets_media_type_not_blank CHECK (length(btrim(media_type)) > 0),
  CONSTRAINT content_assets_file_name_not_blank CHECK (length(btrim(original_file_name)) > 0),
  CONSTRAINT content_assets_file_name_has_no_path CHECK (
    original_file_name NOT LIKE '%/%'
    AND original_file_name NOT LIKE E'%\\\\%'
  )
);

ALTER TABLE lessons
  ADD COLUMN video_asset_id uuid REFERENCES content_assets (id) ON DELETE RESTRICT;

ALTER TABLE lesson_resources
  ADD COLUMN content_asset_id uuid REFERENCES content_assets (id) ON DELETE RESTRICT;

CREATE INDEX lessons_video_asset_id_index
  ON lessons (video_asset_id)
  WHERE video_asset_id IS NOT NULL;

CREATE INDEX lesson_resources_content_asset_id_index
  ON lesson_resources (content_asset_id)
  WHERE content_asset_id IS NOT NULL;

CREATE TRIGGER content_assets_set_updated_at
BEFORE UPDATE ON content_assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.content_assets FROM anon, authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = '';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learnhub-content',
  'learnhub-content',
  false,
  2147483648,
  ARRAY['video/mp4', 'application/pdf', 'text/plain', 'application/zip']::text[]
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
