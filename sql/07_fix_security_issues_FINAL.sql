-- =====================================================
-- Supabase 보안 문제 해결 (자동 이메일 설정)
-- =====================================================

-- ===== 1. Memos 테이블 RLS 정책 수정 =====
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Allow admin read access" ON memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON memos;
DROP POLICY IF EXISTS "Allow admin update access" ON memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON memos;

-- 새 정책: users 테이블의 관리자만 허용
CREATE POLICY "Allow admin read access"
  ON memos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

CREATE POLICY "Allow admin insert access"
  ON memos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

CREATE POLICY "Allow admin update access"
  ON memos FOR UPDATE
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

CREATE POLICY "Allow admin delete access"
  ON memos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.name IN ('최지훈', '김윤기', '김구민')
    )
  );

-- ===== 2. update_updated_at_column 함수 수정 =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ===== 3. update_session_with_mileage 함수 수정 =====
CREATE OR REPLACE FUNCTION update_session_with_mileage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- ===== 4. session_count_logs RLS 정책 추가 (빈 에러 방지) =====
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Enable all for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for system" ON session_count_logs;

-- 새 정책: 인증된 사용자 모두 접근 가능
CREATE POLICY "Enable all for authenticated users"
  ON session_count_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
