-- ================================================================
-- schedules 테이블에 시간·요일 컬럼 추가
-- 실행 순서: 34 (29_schedules_schema 적용 후)
-- ================================================================

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS day_of_week INT[];

COMMENT ON COLUMN schedules.start_time IS '시작 시간 HH:mm';
COMMENT ON COLUMN schedules.end_time IS '종료 시간 HH:mm';
COMMENT ON COLUMN schedules.day_of_week IS '반복 요일 0=일 1=월 ... 6=토';

-- ================================================================
SELECT 'Schedules time fields (34) applied.' AS status;
