-- ================================================================
-- spokedu_master_program_meta: 수업 콘텐츠 핵심 5개 컬럼 추가
-- ================================================================

ALTER TABLE public.spokedu_master_program_meta
  ADD COLUMN IF NOT EXISTS sm_objective            TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_development_focus    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_coach_script         TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_parent_note          TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_related_spomove_ids  TEXT[]  DEFAULT '{}';

COMMENT ON COLUMN public.spokedu_master_program_meta.sm_objective           IS '수업 목표 (한 줄)';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_development_focus   IS '발달 포인트 (한 줄)';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_coach_script        IS '코치 스크립트';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_parent_note         IS '학부모 설명 문구';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_related_spomove_ids IS 'SPOMOVE 드릴 ID 배열';

SELECT 'spokedu_master_program_meta lesson_detail columns added.' AS status;
