-- mileage_logs에 수업 시작일을 직접 저장하기 위한 컬럼 추가
-- 목적: 모달에서 선택한 "정확한 수업 날짜"를 추론 없이 보존

ALTER TABLE public.mileage_logs
ADD COLUMN IF NOT EXISTS session_started_at timestamptz NULL;

COMMENT ON COLUMN public.mileage_logs.session_started_at
IS '마일리지 로그가 연동된 수업의 실제 시작 시각(sessions.start_at)';

-- 선택: 조회 최적화가 필요하면 인덱스 사용
-- CREATE INDEX IF NOT EXISTS idx_mileage_logs_session_started_at
--   ON public.mileage_logs (session_started_at DESC);
