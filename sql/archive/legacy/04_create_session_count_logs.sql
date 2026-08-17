-- ==========================================
-- 수업 카운팅 로그 테이블 생성
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 1. session_count_logs 테이블 생성
CREATE TABLE IF NOT EXISTS session_count_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  session_title TEXT,
  count_change INTEGER NOT NULL DEFAULT 1,
  reason TEXT DEFAULT '수업 완료',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_session_count_logs_teacher 
  ON session_count_logs(teacher_id);

CREATE INDEX IF NOT EXISTS idx_session_count_logs_created 
  ON session_count_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_count_logs_session 
  ON session_count_logs(session_id);

-- 3. RLS 활성화
ALTER TABLE session_count_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 설정

-- Admin: 모든 권한
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
CREATE POLICY "Admin full access to session count logs"
ON session_count_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- Teacher: 본인 로그만 읽기 가능
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;
CREATE POLICY "Teachers can view own count logs"
ON session_count_logs
FOR SELECT
USING (
  teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- 완료!
-- 확인 쿼리:
-- SELECT * FROM session_count_logs ORDER BY created_at DESC LIMIT 10;
