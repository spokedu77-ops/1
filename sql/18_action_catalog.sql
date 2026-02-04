-- ================================================================
-- action_catalog 테이블 생성
-- 동작 라벨/정렬/활성화 관리 (Source of Truth는 physics.ts의 ACTION_KEYS)
-- ================================================================

CREATE TABLE IF NOT EXISTS action_catalog (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_action_catalog_sort_order ON action_catalog(sort_order);
CREATE INDEX IF NOT EXISTS idx_action_catalog_is_active ON action_catalog(is_active);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_action_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_action_catalog_updated_at
  BEFORE UPDATE ON action_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_action_catalog_updated_at();

-- ================================================================
-- 시드 데이터 삽입 (20개 Action)
-- key는 physics.ts의 ACTION_KEYS와 정확히 일치해야 함
-- ================================================================

INSERT INTO action_catalog (key, label, is_active, sort_order)
VALUES
  ('POINT', '콕 찌르기', true, 1),
  ('TURN', '몸 돌리기', true, 2),
  ('THROW', '던지기', true, 3),
  ('PUNCH', '펀치 펑!', true, 4),
  ('WALK', '제자리 걷기', true, 5),
  ('JUMP', '점프', true, 6),
  ('PULL', '줄 당기기', true, 7),
  ('KNOCK', '노크', true, 8),
  ('CLAP', '박수', true, 9),
  ('CHOP', '장작 패기', true, 10),
  ('RIDE', '타기', true, 11),
  ('SAY_HI', '안녕 흔들기', true, 12),
  ('WIPE', '닦기', true, 13),
  ('SPREAD', '문 열기', true, 14),
  ('CUT', '자르기', true, 15),
  ('STAMP', '쾅 찍기', true, 16),
  ('CRUSH', '으깨기', true, 17),
  ('HAMMER', '박기', true, 18),
  ('SQUASH', '납작하게 누르기', true, 19),
  ('SWING', '휘두르기', true, 20)
ON CONFLICT (key)
DO UPDATE SET
  label = EXCLUDED.label,
  updated_at = NOW();

-- ================================================================
-- 주의사항
-- ================================================================
-- 1. key는 physics.ts의 ACTION_KEYS와 정확히 일치해야 함
-- 2. key 추가/삭제는 개발자가 physics.ts에서만 수행
-- 3. label 수정은 대표가 UI에서 가능
-- 4. actionCatalog.ts에서 ACTION_KEYS 검증 로직으로 보호됨
