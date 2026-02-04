-- ================================================================
-- 일정(schedules) 스키마 - 노션형 일정 DB 테이블
-- 실행 순서: 29 (기존 마이그레이션 이후)
-- ================================================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assignee TEXT,
  start_date DATE,
  end_date DATE,
  sessions_count INT,
  note TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- checklist 구조: [{"id":"uuid","text":"항목","done":false}]

CREATE INDEX IF NOT EXISTS idx_schedules_assignee ON schedules(assignee);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_updated_at ON schedules(updated_at DESC);

-- updated_at 트리거 (set_updated_at 함수는 27에서 이미 생성된 경우 사용)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS schedules_updated_at ON schedules;
CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- ================================================================
SELECT 'Schedules schema (29) created successfully.' AS status;
