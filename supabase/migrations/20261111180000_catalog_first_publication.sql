-- REVIEW ONLY. SQL application requires separate approval. No new tables.
-- Only lesson metadata needs schema changes. SPOMOVE reuses assets_json.
-- Evidence-backed pre-rollout SPOMOVE drafts can retain eligibility by seeding
-- assets_json.publication[activity_id] = {"state":"never"} during this separate
-- rollout review. Unknown history stays unmarked; never guess an upload date.
BEGIN;
ALTER TABLE public.spokedu_master_program_meta
  ADD COLUMN sm_first_published_at timestamptz,
  ADD COLUMN sm_publication_history text NOT NULL DEFAULT 'unknown'
    CHECK (sm_publication_history IN ('unknown', 'never', 'published')),
  ADD CONSTRAINT master_publication_date_state CHECK (
    (sm_publication_history = 'published') = (sm_first_published_at IS NOT NULL)
  );

-- Existing content has no reliable first-publication history: do not guess dates.
INSERT INTO public.spokedu_master_program_meta (curriculum_id, sm_publication_history)
SELECT id, 'unknown' FROM public.curriculum WHERE is_sub = false
ON CONFLICT (curriculum_id) DO NOTHING;
ALTER TABLE public.spokedu_master_program_meta
  ALTER COLUMN sm_publication_history SET DEFAULT 'never';

-- Before applying, populate ONLY with evidence-backed never-published draft IDs.
-- A currently hidden flag alone does not prove a program was never published.
-- This keeps pre-rollout drafts eligible without relabeling past public content.
WITH verified_never_published AS (
  SELECT unnest(ARRAY[]::integer[]) AS curriculum_id
)
UPDATE public.spokedu_master_program_meta m SET sm_publication_history = 'never'
FROM verified_never_published v
WHERE m.curriculum_id = v.curriculum_id AND m.sm_publication_history = 'unknown';

CREATE FUNCTION public.guard_master_first_publication() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.sm_first_published_at := NULL;
    NEW.sm_publication_history := 'never';
  ELSIF current_setting('spokedu.record_publication', true) IS DISTINCT FROM 'on' THEN
    NEW.sm_first_published_at := OLD.sm_first_published_at;
    NEW.sm_publication_history := OLD.sm_publication_history;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_master_first_publication
BEFORE INSERT OR UPDATE ON public.spokedu_master_program_meta
FOR EACH ROW EXECUTE FUNCTION public.guard_master_first_publication();

-- Called only by existing admin registration/publication saves, after validating
-- the saved program through the existing customer-catalog loader. Edits and
-- republication never overwrite the first successful upload/publication time.
CREATE FUNCTION public.record_master_lesson_first_publication(p_curriculum_ids bigint[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM set_config('spokedu.record_publication', 'on', true);
  UPDATE public.spokedu_master_program_meta m
  SET sm_first_published_at = statement_timestamp(), sm_publication_history = 'published'
  WHERE m.curriculum_id = ANY(p_curriculum_ids) AND m.sm_publication_history = 'never'
    AND EXISTS (SELECT 1 FROM public.spokedu_pro_programs p
      WHERE p.source_center_curriculum_id = m.curriculum_id AND p.is_published = true);
  PERFORM set_config('spokedu.record_publication', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.record_master_lesson_first_publication(bigint[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_master_lesson_first_publication(bigint[]) TO service_role;
COMMIT;
