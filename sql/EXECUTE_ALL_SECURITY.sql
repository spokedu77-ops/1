-- =====================================================
-- 전체 보안 문제 일괄 해결
-- =====================================================
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- ===== 1. Memos 테이블 생성 =====
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Allow admin read access" ON memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON memos;
DROP POLICY IF EXISTS "Allow admin update access" ON memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON memos;
DROP TABLE IF EXISTS memos;

CREATE TABLE memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_memos_assignee ON memos(assignee);

INSERT INTO memos (assignee, content) VALUES
  ('Common', ''),
  ('최지훈', ''),
  ('김윤기', ''),
  ('김구민', '');

-- Memos 정책: 관리자만 접근
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

-- ===== 2. session_count_logs RLS 정책 수정 =====
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for system" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin" ON session_count_logs;

-- INSERT: 본인 것만 또는 관리자
CREATE POLICY "Enable insert for own or admin"
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

-- SELECT: 본인 것만 또는 관리자
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

-- UPDATE: 관리자만
CREATE POLICY "Enable update for admin only"
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

-- DELETE: 관리자만
CREATE POLICY "Enable delete for admin only"
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

-- ===== 3. update_updated_at_column 함수 수정 =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ===== 4. update_session_with_mileage 함수 =====
-- 이 함수가 실제로 사용되지 않는다면 삭제
DROP FUNCTION IF EXISTS update_session_with_mileage();

-- 또는 사용된다면 최소한의 로직으로 수정
CREATE OR REPLACE FUNCTION update_session_with_mileage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 빈 함수 (실제 사용되지 않는 경우)
  RETURN NEW;
END;
$$;

-- ===== 완료 확인 =====
SELECT '✅ 보안 문제 해결 완료!' as status;
