-- =====================================================
-- session_count_logs RLS 정책 수정
-- =====================================================
-- 문제: autoFinishSessions가 서버에서 실행되어 INSERT 실패
-- 해결: 시스템이 로그를 삽입할 수 있도록 정책 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for system" ON session_count_logs;

-- 새 정책 1: 모든 인증된 사용자가 삽입 가능 (시스템 로그용)
CREATE POLICY "Enable insert for authenticated users"
  ON session_count_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 새 정책 2: 읽기는 본인 것만 또는 관리자
CREATE POLICY "Enable read for own or admin"
  ON session_count_logs
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

-- 새 정책 3: 관리자만 수정/삭제
CREATE POLICY "Enable update for admin"
  ON session_count_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

CREATE POLICY "Enable delete for admin"
  ON session_count_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

-- 확인
SELECT * FROM pg_policies WHERE tablename = 'session_count_logs';
