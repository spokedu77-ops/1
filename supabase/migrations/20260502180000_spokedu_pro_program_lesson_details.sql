-- SPOKEDU PRO: 프로그램별 고도화 수업안 (curriculum.id 기준 overlay)
-- curriculum / spokedu_pro_programs / import-center 로직과 분리. service_role API만 쓰기.

CREATE TABLE IF NOT EXISTS public.spokedu_pro_program_lesson_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id bigint NOT NULL,
  is_featured_lesson boolean NOT NULL DEFAULT false,
  summary text,
  recommended_age text,
  recommended_players text,
  duration text,
  space text,
  objective text,
  development_focus text,
  coach_script text,
  parent_note text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_tips jsonb NOT NULL DEFAULT '[]'::jsonb,
  variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  safety_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_program_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_spomove_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  package_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spokedu_pro_program_lesson_details_curriculum_id_key UNIQUE (curriculum_id)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_program_lesson_details_curriculum_id
  ON public.spokedu_pro_program_lesson_details (curriculum_id);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_program_lesson_details_featured
  ON public.spokedu_pro_program_lesson_details (is_featured_lesson)
  WHERE is_featured_lesson = true;

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_program_lesson_details_package_keys_gin
  ON public.spokedu_pro_program_lesson_details USING gin (package_keys);

DROP TRIGGER IF EXISTS trg_spokedu_pro_program_lesson_details_updated_at ON public.spokedu_pro_program_lesson_details;
CREATE TRIGGER trg_spokedu_pro_program_lesson_details_updated_at
  BEFORE UPDATE ON public.spokedu_pro_program_lesson_details
  FOR EACH ROW
  EXECUTE FUNCTION public.spokedu_pro_set_updated_at();

COMMENT ON TABLE public.spokedu_pro_program_lesson_details IS 'SPOKEDU PRO 수업안 고도화 overlay; curriculum.id 기준. import-center와 무관.';

ALTER TABLE public.spokedu_pro_program_lesson_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spokedu_pro_program_lesson_details_deny_all ON public.spokedu_pro_program_lesson_details;

CREATE POLICY spokedu_pro_program_lesson_details_deny_all
  ON public.spokedu_pro_program_lesson_details
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
