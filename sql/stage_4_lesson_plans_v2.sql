-- ===================================================================
-- Stage 4 v2: 수업안 시스템 - sessions 연동
-- ===================================================================

-- 기존 테이블 백업
CREATE TABLE IF NOT EXISTS lesson_plans_backup AS SELECT * FROM lesson_plans;

-- 백업 테이블 RLS 활성화
ALTER TABLE lesson_plans_backup ENABLE ROW LEVEL SECURITY;

-- 백업 테이블은 Admin만 조회 가능
DROP POLICY IF EXISTS lesson_plans_backup_admin ON lesson_plans_backup;
CREATE POLICY lesson_plans_backup_admin ON lesson_plans_backup 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );

-- 기존 테이블 삭제
DROP TABLE IF EXISTS lesson_plans CASCADE;

-- 새 테이블 생성 (sessions 연동)
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lesson_plans_session ON lesson_plans(session_id);

-- RLS 활성화
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS lesson_plans_teacher ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_admin ON lesson_plans;

-- 선생님: 본인이 생성한 session의 수업안만 조회/수정
CREATE POLICY lesson_plans_teacher ON lesson_plans 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = lesson_plans.session_id 
      AND sessions.created_by = auth.uid()
    )
  );

-- Admin: 모든 수업안 조회
CREATE POLICY lesson_plans_admin ON lesson_plans 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );

-- ===================================================================
-- 확인 쿼리 (선택사항)
-- ===================================================================

-- 백업 테이블 확인
-- SELECT COUNT(*) FROM lesson_plans_backup;

-- 새 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename = 'lesson_plans';

-- Policy 확인
-- SELECT policyname FROM pg_policies WHERE tablename = 'lesson_plans';

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename = 'lesson_plans';

-- ===================================================================
-- 완료!
-- ===================================================================
