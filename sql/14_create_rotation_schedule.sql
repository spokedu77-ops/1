-- ================================================================
-- Weekly Prescription Rotation Schedule 테이블 생성
-- 주차별 프로그램 로테이션 관리 시스템
-- ================================================================

-- 주간 로테이션 스케줄 테이블
CREATE TABLE IF NOT EXISTS rotation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key TEXT UNIQUE NOT NULL, -- 형식: '2026-01-W4' (연도-월-주차)
  program_id TEXT REFERENCES warmup_programs_composite(id) ON DELETE CASCADE,
  expert_note TEXT, -- 해당 주차에 강사에게 전달할 전문가 코멘트
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_week_key ON rotation_schedule(week_key);
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_published ON rotation_schedule(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_program_id ON rotation_schedule(program_id);

-- RLS 정책
ALTER TABLE rotation_schedule ENABLE ROW LEVEL SECURITY;

-- SELECT: published는 모든 authenticated, 관리자는 전체
CREATE POLICY "rotation_schedule_select"
ON rotation_schedule FOR SELECT TO authenticated
USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  )
);

CREATE POLICY "rotation_schedule_admin_insert"
ON rotation_schedule FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
));

CREATE POLICY "rotation_schedule_admin_update"
ON rotation_schedule FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
));

CREATE POLICY "rotation_schedule_admin_delete"
ON rotation_schedule FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
));

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_rotation_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rotation_schedule_updated_at
BEFORE UPDATE ON rotation_schedule
FOR EACH ROW
EXECUTE FUNCTION update_rotation_schedule_updated_at();

-- ================================================================
-- 완료
-- ================================================================

SELECT 'Rotation schedule table created successfully!' AS status;
