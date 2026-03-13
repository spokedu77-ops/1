-- 스크린플레이 72개 카탈로그 (mode_id = CHALLENGE, FLOW, 반응인지, 순차기억, 스트룹, 이중과제)
-- spokedu_pro_set_updated_at() 트리거 함수는 20260308000000_spokedu_pro_commercial.sql 에 정의됨

CREATE TABLE IF NOT EXISTS spokedu_pro_screenplays (
  id            SERIAL PRIMARY KEY,
  mode_id       TEXT NOT NULL,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  preset_ref    TEXT,
  thumbnail_url TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_mode_id    ON spokedu_pro_screenplays(mode_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_sort_order ON spokedu_pro_screenplays(sort_order);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_published  ON spokedu_pro_screenplays(is_published);

ALTER TABLE spokedu_pro_screenplays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screenplays_read_published"
  ON spokedu_pro_screenplays FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE TRIGGER spokedu_pro_screenplays_set_updated_at
  BEFORE UPDATE ON spokedu_pro_screenplays
  FOR EACH ROW EXECUTE FUNCTION spokedu_pro_set_updated_at();
