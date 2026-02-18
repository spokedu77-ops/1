-- ================================================================
-- 일정(schedules): status 3단계(scheduled/active/done) + center_id 연동
-- 실행 순서: 37 (29, 34, 27 적용 후)
-- ================================================================

-- 1. status CHECK 확장: 'scheduled' 추가
ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_status_check;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_status_check
  CHECK (status IN ('scheduled', 'active', 'done'));

-- 2. center_id 추가 (센터 연동)
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_center_id ON schedules(center_id);

COMMENT ON COLUMN schedules.center_id IS '연결된 센터(선택)';

-- ================================================================
SELECT 'Schedules status + center_id (37) applied.' AS status;
