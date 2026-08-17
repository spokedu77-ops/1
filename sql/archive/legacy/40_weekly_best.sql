-- 주간베스트 게시물 테이블 (1행 = 공지+지도안+포토+피드백 묶음 1건)
-- Admin 공지 페이지에서 "주간베스트 올리기" 시 4단계 입력 후 한 번에 저장

CREATE TABLE IF NOT EXISTS weekly_best (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  lesson_plan_session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  feedback_session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_best_created_at ON weekly_best(created_at DESC);

ALTER TABLE weekly_best ENABLE ROW LEVEL SECURITY;

-- is_admin() 함수는 프로젝트에 이미 있음. admin만 전체 CRUD
DROP POLICY IF EXISTS "weekly_best_admin_all" ON weekly_best;
CREATE POLICY "weekly_best_admin_all" ON weekly_best
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
