-- ================================================================
-- Think 전용 Asset Pack 테이블 생성
-- Play Asset Pack과 완전 분리
-- ================================================================

-- ================================================================
-- 1. think_asset_packs 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS think_asset_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assets_json JSONB NOT NULL
);

-- 샘플 Asset Pack 데이터 삽입
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'think_kitchen_v1',
  '주방 테마 Think Asset Pack',
  'kitchen',
  '{
    "colors": {
      "red": "themes/kitchen_v1/think/colors/red.webp",
      "blue": "themes/kitchen_v1/think/colors/blue.webp",
      "yellow": "themes/kitchen_v1/think/colors/yellow.webp",
      "green": "themes/kitchen_v1/think/colors/green.webp"
    }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  theme = EXCLUDED.theme,
  assets_json = EXCLUDED.assets_json,
  updated_at = NOW();

-- ================================================================
-- 2. RLS 정책 설정
-- ================================================================

-- think_asset_packs RLS 활성화
ALTER TABLE think_asset_packs ENABLE ROW LEVEL SECURITY;

-- Admin 전체 권한
CREATE POLICY "Admin full access to think asset packs"
ON think_asset_packs
FOR ALL
USING (is_admin());

-- 모든 사용자 읽기 권한
CREATE POLICY "All users can read think asset packs"
ON think_asset_packs
FOR SELECT
USING (true);

-- ================================================================
-- 3. 인덱스 생성 (성능 최적화)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_think_asset_packs_theme ON think_asset_packs(theme);
