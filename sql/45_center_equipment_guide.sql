-- 센터 스포츠 교구 가이드라인 (번호 1~12, 단계 1~4)
CREATE TABLE IF NOT EXISTS center_equipment_guide (
  id BIGSERIAL PRIMARY KEY,
  number SMALLINT NOT NULL CHECK (number >= 1 AND number <= 12),
  step SMALLINT NOT NULL CHECK (step >= 1 AND step <= 4),
  name TEXT NOT NULL,
  image_url TEXT,
  detail_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_equipment_guide_number_step ON center_equipment_guide (number, step);

COMMENT ON TABLE center_equipment_guide IS '센터 스포츠 교구 가이드라인 (번호 1~12, 단계 1~4, 교구 이름+이미지)';

ALTER TABLE center_equipment_guide ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_equipment_guide_admin_all" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_select_authenticated" ON center_equipment_guide;

CREATE POLICY "center_equipment_guide_select" ON center_equipment_guide
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "center_equipment_guide_admin_insert" ON center_equipment_guide
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "center_equipment_guide_admin_update" ON center_equipment_guide
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "center_equipment_guide_admin_delete" ON center_equipment_guide
  FOR DELETE TO authenticated USING (is_admin());
