-- SPOKEDU PRO: 고도화 수업안 작성 상태 (draft / reviewed)

ALTER TABLE public.spokedu_pro_program_lesson_details
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.spokedu_pro_program_lesson_details
  DROP CONSTRAINT IF EXISTS spokedu_pro_program_lesson_details_status_check;

ALTER TABLE public.spokedu_pro_program_lesson_details
  ADD CONSTRAINT spokedu_pro_program_lesson_details_status_check
  CHECK (status IN ('draft', 'reviewed'));

COMMENT ON COLUMN public.spokedu_pro_program_lesson_details.status IS 'draft=작성 중, reviewed=검수 완료';

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_program_lesson_details_status
  ON public.spokedu_pro_program_lesson_details (status);
