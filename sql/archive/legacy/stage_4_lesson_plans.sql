-- ===================================================================
-- Stage 4: 수업안 관리 시스템 - 간소화 버전
-- ===================================================================

-- 수업안 테이블
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_title TEXT NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_title, week_number)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_title ON lesson_plans(class_title);

-- RLS 활성화
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS lesson_plans_teacher ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_admin ON lesson_plans;

-- 선생님: 본인 수업안만 조회/수정
CREATE POLICY lesson_plans_teacher ON lesson_plans 
  FOR ALL 
  USING (auth.uid() = teacher_id);

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

-- 테이블 생성 확인
-- SELECT tablename FROM pg_tables WHERE tablename = 'lesson_plans';

-- Policy 확인
-- SELECT policyname FROM pg_policies WHERE tablename = 'lesson_plans';

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename = 'lesson_plans';

-- ===================================================================
-- 완료!
-- ===================================================================
