-- 스포키듀 프로 스크린플레이 테이블 (72개)
-- 스크린플레이는 프로그램(144개)과 별개: 인터랙티브 모드 (인지·반응 훈련)

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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_mode_id    ON spokedu_pro_screenplays(mode_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_sort_order ON spokedu_pro_screenplays(sort_order);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_published  ON spokedu_pro_screenplays(is_published);

-- RLS
ALTER TABLE spokedu_pro_screenplays ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자: 공개된 스크린플레이만 읽기
CREATE POLICY "screenplays_read_published"
  ON spokedu_pro_screenplays FOR SELECT
  TO authenticated
  USING (is_published = true);

-- 어드민 (service_role): 전체 읽기/쓰기 (API에서만 사용)
-- service_role은 RLS bypass이므로 별도 정책 불필요

-- updated_at 자동 갱신 트리거
CREATE TRIGGER spokedu_pro_screenplays_set_updated_at
  BEFORE UPDATE ON spokedu_pro_screenplays
  FOR EACH ROW EXECUTE FUNCTION spokedu_pro_set_updated_at();
