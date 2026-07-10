-- 단계별 활동: 활동 이미지, 동영상 또는 활동 내용
ALTER TABLE center_equipment_guide
  ADD COLUMN IF NOT EXISTS activity_image_url TEXT,
  ADD COLUMN IF NOT EXISTS activity_video_url TEXT,
  ADD COLUMN IF NOT EXISTS activity_text TEXT;

COMMENT ON COLUMN center_equipment_guide.activity_image_url IS '단계별 활동 이미지 URL';
COMMENT ON COLUMN center_equipment_guide.activity_video_url IS '단계별 활동 동영상 링크';
COMMENT ON COLUMN center_equipment_guide.activity_text IS '단계별 활동 내용';
