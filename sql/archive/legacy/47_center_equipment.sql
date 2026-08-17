-- 번호별 고정 교구 12개 (이름 + 이미지)
CREATE TABLE IF NOT EXISTS center_equipment (
  id BIGSERIAL PRIMARY KEY,
  number SMALLINT NOT NULL UNIQUE CHECK (number >= 1 AND number <= 12),
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE center_equipment IS '센터 스포츠 교구 12개 고정 (번호별 교구 이름+이미지)';

-- 12개 행 초기 삽입
INSERT INTO center_equipment (number, name)
SELECT n, '' FROM generate_series(1, 12) AS n
ON CONFLICT (number) DO NOTHING;

ALTER TABLE center_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_equipment_admin_all" ON center_equipment;
CREATE POLICY "center_equipment_admin_all" ON center_equipment
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "center_equipment_select_authenticated" ON center_equipment;
CREATE POLICY "center_equipment_select_authenticated" ON center_equipment
  FOR SELECT TO authenticated
  USING (true);
