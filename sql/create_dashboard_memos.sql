-- =====================================================
-- dashboard_memos 테이블 생성 (HQ 대시보드 메모, assignee UUID 에러 회피)
-- Supabase SQL 에디터에서 실행 후 메모 저장 기능 사용 가능
-- =====================================================

CREATE TABLE IF NOT EXISTS dashboard_memos (
  board_id TEXT NOT NULL PRIMARY KEY,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dashboard_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_memos_all" ON dashboard_memos;
CREATE POLICY "dashboard_memos_all" ON dashboard_memos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO dashboard_memos (board_id, content) VALUES
  ('Common', ''),
  ('최지훈', ''),
  ('김윤기', ''),
  ('김구민', '')
ON CONFLICT (board_id) DO NOTHING;
