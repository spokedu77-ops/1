-- 8회기: 링크 2 세부내용 전용 컬럼
ALTER TABLE personal_curriculum
  ADD COLUMN IF NOT EXISTS detail_text_2 TEXT;

COMMENT ON COLUMN personal_curriculum.detail_text_2 IS '8회기 링크 2 세부내용';
