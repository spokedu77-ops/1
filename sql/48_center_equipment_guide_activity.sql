-- 단계별 활동: 활동 이미지 또는 활동 내용
ALTER TABLE center_equipment_guide
  ADD COLUMN IF NOT EXISTS activity_image_url TEXT,
  ADD COLUMN IF NOT EXISTS activity_text TEXT;

COMMENT ON COLUMN center_equipment_guide.activity_image_url IS '단계별 활동 이미지 URL';
COMMENT ON COLUMN center_equipment_guide.activity_text IS '단계별 활동 내용';
