-- ================================================================
-- Play Asset Pack 테이블 (주차별 BGM + 5 action × 2 variant 이미지)
-- Asset Hub Play 탭에서 사용
-- ================================================================

CREATE TABLE IF NOT EXISTS play_asset_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL,
  week INT NOT NULL CHECK (week >= 1 AND week <= 4),
  week_key TEXT NOT NULL UNIQUE,
  bgm_path TEXT,
  images_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_play_asset_packs_week_key ON play_asset_packs(week_key);
CREATE INDEX IF NOT EXISTS idx_play_asset_packs_year_month ON play_asset_packs(year, month, week);

ALTER TABLE play_asset_packs ENABLE ROW LEVEL SECURITY;

-- Admin 전체 권한
DROP POLICY IF EXISTS "Admin full access to play asset packs" ON play_asset_packs;
CREATE POLICY "Admin full access to play asset packs"
ON play_asset_packs FOR ALL
USING (is_admin());

-- 구독자 읽기 (published 스케줄에서 참조 시)
DROP POLICY IF EXISTS "All users can read play asset packs" ON play_asset_packs;
CREATE POLICY "All users can read play asset packs"
ON play_asset_packs FOR SELECT
USING (true);

COMMENT ON TABLE play_asset_packs IS '주차별 Play Phase 자산 (BGM + 5 action × off/on 이미지)';
COMMENT ON COLUMN play_asset_packs.images_json IS 'Record<PlaySlotKey, string> e.g. { a1_off: "path", a1_on: "path", ... }';
