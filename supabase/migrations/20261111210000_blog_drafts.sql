-- Blog manuscript board. Additive only. Service role writes, same pattern as field_records.
BEGIN;
CREATE TABLE public.blog_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 200),
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
  category text NOT NULL DEFAULT '기타' CHECK (category IN ('아동체육','특수체육','SPOMOVE','교육정보','기타')),
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','complete','published')),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  excerpt text NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 400),
  featured_image uuid,
  published_url text CHECK (published_url IS NULL OR char_length(published_url) <= 500),
  published_at timestamptz,
  plain_text text NOT NULL DEFAULT '',
  revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(tags) <= 12),
  CHECK ((status = 'published') = (published_at IS NOT NULL)),
  CHECK (published_url IS NULL OR published_url ~ '^https://')
);
CREATE INDEX blog_drafts_updated ON public.blog_drafts(updated_at DESC);
CREATE INDEX blog_drafts_created ON public.blog_drafts(created_at DESC);
CREATE INDEX blog_drafts_category ON public.blog_drafts(category);
CREATE INDEX blog_drafts_title ON public.blog_drafts(title);

CREATE TABLE public.blog_draft_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.blog_drafts(id) ON DELETE CASCADE,
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  revision_number bigint NOT NULL CHECK (revision_number > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, revision_number)
);
CREATE INDEX blog_draft_revisions_draft ON public.blog_draft_revisions(draft_id, revision_number DESC);

CREATE TABLE public.blog_draft_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.blog_drafts(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type = 'image/webp'),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_draft_media_draft ON public.blog_draft_media(draft_id);
-- featured_image stores a media id without an FK. A foreign key would cycle with draft_id.

ALTER TABLE public.blog_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_draft_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_draft_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_drafts, public.blog_draft_revisions, public.blog_draft_media FROM anon, authenticated;
GRANT ALL ON public.blog_drafts, public.blog_draft_revisions, public.blog_draft_media TO service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-draft-media', 'blog-draft-media', false, 10485760, ARRAY['image/webp'])
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='blog-draft-media' AND public) THEN
    RAISE EXCEPTION 'BLOG_DRAFT_MEDIA_BUCKET_MUST_BE_PRIVATE';
  END IF;
END $$;
CREATE POLICY blog_draft_media_private_namespace ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (bucket_id <> 'blog-draft-media') WITH CHECK (bucket_id <> 'blog-draft-media');
COMMIT;
