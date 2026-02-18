-- 주간베스트 테이블 (한 번만 실행)
-- 지도안/피드백은 없음 선택 가능하므로 NULL 허용

CREATE TABLE IF NOT EXISTS weekly_best (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  lesson_plan_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  feedback_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_best_created_at ON weekly_best(created_at DESC);

ALTER TABLE weekly_best ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_best_admin_all" ON weekly_best;
CREATE POLICY "weekly_best_admin_all" ON weekly_best
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
