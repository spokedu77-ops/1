-- =====================================================
-- Memos 테이블 생성 (대시보드 메모 기능)
-- =====================================================

-- 기존 테이블 삭제 (선택사항 - 주의!)
-- DROP TABLE IF EXISTS memos;

-- Memos 테이블 생성
CREATE TABLE IF NOT EXISTS memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee TEXT NOT NULL UNIQUE,  -- 'Common', '최지훈', '김윤기', '김구민'
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

-- 정책: 인증된 사용자는 모든 메모를 읽고 쓸 수 있음
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_memos_assignee ON memos(assignee);

-- 초기 데이터 (선택사항)
INSERT INTO memos (assignee, content) VALUES
  ('Common', ''),
  ('최지훈', ''),
  ('김윤기', ''),
  ('김구민', '')
ON CONFLICT (assignee) DO NOTHING;
