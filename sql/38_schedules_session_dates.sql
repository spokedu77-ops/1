-- ================================================================
-- 일정(schedules): 특정 일자만 (단회/2회기) 지원
-- 실행 순서: 38 (29, 34, 37 적용 후)
-- ================================================================

-- session_dates: 해당 일자들만 수업하는 경우 (예: 4.11, 11.14 두 날만)
-- 있으면 "4.11, 11.14" 표시, 없으면 start_date ~ end_date 기간 표시
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS session_dates DATE[];

COMMENT ON COLUMN schedules.session_dates IS '특정 일자만 수업 시 해당 날짜들 (비어있으면 start_date~end_date 기간 사용)';

-- ================================================================
SELECT 'Schedules session_dates (38) applied.' AS status;
