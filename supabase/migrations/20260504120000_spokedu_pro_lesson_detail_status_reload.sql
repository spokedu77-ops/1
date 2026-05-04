-- status 컬럼 보강 + PostgREST 스키마 캐시 갱신
-- (이전 마이그레이션이 적용되지 않았거나 캐시가 남은 환경 대비)

ALTER TABLE public.spokedu_pro_program_lesson_details
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.spokedu_pro_program_lesson_details
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE public.spokedu_pro_program_lesson_details
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.spokedu_pro_program_lesson_details
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.spokedu_pro_program_lesson_details
  DROP CONSTRAINT IF EXISTS spokedu_pro_program_lesson_details_status_check;

ALTER TABLE public.spokedu_pro_program_lesson_details
  ADD CONSTRAINT spokedu_pro_program_lesson_details_status_check
  CHECK (status IN ('draft', 'reviewed'));

-- Supabase/PostgREST: 스키마 캐시 즉시 리로드 (API에서 컬럼 인식)
SELECT pg_notify('pgrst', 'reload schema');
