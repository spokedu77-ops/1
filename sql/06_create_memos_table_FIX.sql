-- =====================================================
-- Memos 테이블 재생성 (기존 테이블 삭제 후)
-- =====================================================

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON memos;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS memos;

-- 3. Memos 테이블 생성
CREATE TABLE memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS 활성화
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

-- 5. 정책 생성
CREATE POLICY "Enable read access for authenticated users"
  ON memos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON memos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON memos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete access for authenticated users"
  ON memos FOR DELETE
  TO authenticated
  USING (true);

-- 6. 인덱스 생성
CREATE INDEX idx_memos_assignee ON memos(assignee);

-- 7. 초기 데이터
INSERT INTO memos (assignee, content) VALUES
  ('Common', ''),
  ('최지훈', ''),
  ('김윤기', ''),
  ('김구민', '');
