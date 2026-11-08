-- Apply only after explicit approval for the existing project's operational DB.
-- Separate public snapshot from editable draft. No existing business tables change.
BEGIN;
CREATE TABLE public.field_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
  draft_content jsonb NOT NULL CHECK (jsonb_typeof(draft_content) = 'object'),
  published_content jsonb CHECK (published_content IS NULL OR jsonb_typeof(published_content) = 'object'),
  featured_slot smallint CHECK (featured_slot BETWEEN 1 AND 3),
  published_at timestamptz,
  revision bigint NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (featured_slot IS NULL OR published_content IS NOT NULL),
  CHECK ((published_content IS NULL) = (published_at IS NULL))
);
CREATE UNIQUE INDEX field_records_featured_slot ON public.field_records(featured_slot) WHERE featured_slot IS NOT NULL;
CREATE INDEX field_records_published_date ON public.field_records(published_at DESC) WHERE published_content IS NOT NULL;
CREATE TABLE public.field_record_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.field_records(id) ON DELETE RESTRICT,
  object_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_record_media_record ON public.field_record_media(record_id);
ALTER TABLE public.field_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_record_media ENABLE ROW LEVEL SECURITY;
-- Browser clients never read drafts or originals, even when logged in.
REVOKE ALL ON public.field_records, public.field_record_media FROM anon, authenticated;
GRANT ALL ON public.field_records, public.field_record_media TO service_role;

-- New private namespace in the EXISTING Supabase project. No policy grants client access.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('field-record-media', 'field-record-media', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='field-record-media' AND public) THEN
    RAISE EXCEPTION 'FIELD_RECORD_MEDIA_BUCKET_MUST_BE_PRIVATE';
  END IF;
END $$;
-- Existing broad Storage policies must not grant access to this new private namespace.
CREATE POLICY field_record_media_private_namespace ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (bucket_id <> 'field-record-media') WITH CHECK (bucket_id <> 'field-record-media');

CREATE FUNCTION public.mutate_field_record(
  p_id uuid, p_revision bigint, p_action text, p_user uuid,
  p_slug text DEFAULT NULL, p_content jsonb DEFAULT NULL,
  p_slot smallint DEFAULT NULL, p_published_at timestamptz DEFAULT NULL
) RETURNS public.field_records LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE r public.field_records; m jsonb;
BEGIN
  SELECT * INTO r FROM public.field_records WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECORD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF r.revision <> p_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF p_action IN ('save','review') THEN
    IF p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN RAISE EXCEPTION 'INVALID_CONTENT'; END IF;
    -- Published slugs remain stable after withdrawal as well (revision history URL protection).
    IF p_slug IS DISTINCT FROM r.slug AND (r.published_content IS NOT NULL OR r.draft_content->>'_everPublished'='true') THEN RAISE EXCEPTION 'PUBLISHED_SLUG_IMMUTABLE'; END IF;
    UPDATE public.field_records SET slug=p_slug,
      draft_content=p_content || CASE WHEN r.draft_content->>'_everPublished'='true' THEN '{"_everPublished":true}'::jsonb ELSE '{}'::jsonb END,
      status=CASE WHEN p_action='review' THEN 'review' ELSE 'draft' END,
      revision=revision+1, updated_by=p_user, updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSIF p_action='publish' THEN
    IF NOT coalesce((r.draft_content->>'imagePublicConfirmed')::boolean,false) THEN RAISE EXCEPTION 'IMAGE_CONSENT_REQUIRED'; END IF;
    IF r.draft_content->'hero' IS NULL OR r.draft_content->'hero'='null'::jsonb THEN RAISE EXCEPTION 'HERO_REQUIRED'; END IF;
    FOR m IN SELECT value FROM jsonb_array_elements(jsonb_build_array(r.draft_content->'hero') || coalesce(r.draft_content->'gallery','[]'::jsonb)) LOOP
      IF NOT coalesce((m->>'publicConfirmed')::boolean,false) OR coalesce(trim(m->>'alt'),'')='' THEN RAISE EXCEPTION 'IMAGE_CONSENT_REQUIRED'; END IF;
      IF m->>'id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.field_record_media WHERE id=(m->>'id')::uuid AND record_id=p_id) THEN RAISE EXCEPTION 'MEDIA_NOT_OWNED'; END IF;
    END LOOP;
    IF coalesce(p_published_at,now()) > now() THEN RAISE EXCEPTION 'FUTURE_PUBLICATION_NOT_SUPPORTED'; END IF;
    UPDATE public.field_records SET published_content=draft_content - '_everPublished', draft_content=draft_content || '{"_everPublished":true}'::jsonb,
      status='published', featured_slot=p_slot, published_at=coalesce(p_published_at,published_at,now()),
      revision=revision+1, updated_by=p_user, updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSIF p_action='unpublish' THEN
    UPDATE public.field_records SET published_content=NULL, published_at=NULL, featured_slot=NULL, status='draft',
      revision=revision+1, updated_by=p_user, updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSIF p_action='feature' THEN
    IF r.published_content IS NULL THEN RAISE EXCEPTION 'PUBLISHED_RECORD_REQUIRED'; END IF;
    UPDATE public.field_records SET featured_slot=p_slot,
      draft_content=jsonb_set(draft_content,'{requestedFeaturedSlot}',coalesce(to_jsonb(p_slot),'null'::jsonb),true),
      revision=revision+1, updated_by=p_user, updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.mutate_field_record(uuid,bigint,text,uuid,text,jsonb,smallint,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_field_record(uuid,bigint,text,uuid,text,jsonb,smallint,timestamptz) TO service_role;

CREATE FUNCTION public.delete_field_record_media(p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE m public.field_record_media; r public.field_records;
BEGIN
  SELECT * INTO m FROM public.field_record_media WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEDIA_NOT_FOUND'; END IF;
  SELECT * INTO r FROM public.field_records WHERE id=m.record_id FOR UPDATE;
  IF (coalesce(r.published_content,'{}'::jsonb)::text LIKE '%' || p_id::text || '%')
    OR (r.draft_content::text LIKE '%' || p_id::text || '%') THEN RAISE EXCEPTION 'MEDIA_IN_USE'; END IF;
  DELETE FROM public.field_record_media WHERE id=p_id;
  RETURN m.object_path;
END $$;
REVOKE ALL ON FUNCTION public.delete_field_record_media(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_field_record_media(uuid) TO service_role;
COMMIT;
