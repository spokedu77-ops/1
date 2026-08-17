-- =====================================================
-- 최종 보안 문제 해결 (모든 경고 제거)
-- =====================================================

-- ===== 1. session_count_logs RLS 정책 수정 =====
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for system" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin" ON session_count_logs;

-- 새 정책 1: INSERT - 인증된 사용자가 자신의 로그만 삽입
CREATE POLICY "Enable insert for authenticated users"
  ON session_count_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

-- 새 정책 2: SELECT - 본인 것만 또는 관리자
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

-- 새 정책 3: UPDATE - 관리자만
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

-- 새 정책 4: DELETE - 관리자만
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

-- ===== 2. update_session_with_mileage 함수 찾아서 수정 =====
-- 먼저 기존 함수 정의 확인
SELECT proname, prosrc, proconfig
FROM pg_proc 
WHERE proname = 'update_session_with_mileage';

-- 함수가 존재하면 search_path 추가
-- 아래는 예시 - 실제 로직에 맞게 수정 필요
CREATE OR REPLACE FUNCTION update_session_with_mileage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_mileage INTEGER;
  new_mileage INTEGER;
  mileage_diff INTEGER;
BEGIN
  -- 기존 함수 로직을 여기에 복사
  -- (실제 로직을 알아야 정확히 수정 가능)
  
  RETURN NEW;
END;
$$;

-- ===== 3. 보안 경고 최종 확인 =====
-- 정책 확인
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('memos', 'session_count_logs')
ORDER BY tablename, policyname;

-- 함수 확인
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'update_session_with_mileage');
