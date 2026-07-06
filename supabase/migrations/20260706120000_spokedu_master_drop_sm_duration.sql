-- MASTER 라이브러리: 미사용 수업 시간(sm_duration) 컬럼 제거
ALTER TABLE public.spokedu_master_program_meta
  DROP COLUMN IF EXISTS sm_duration;

SELECT 'spokedu_master_program_meta sm_duration dropped.' AS status;
