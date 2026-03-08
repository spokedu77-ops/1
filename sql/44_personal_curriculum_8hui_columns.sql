-- 신체 기능향상 8회기: 세부내용 + 링크 2개용 컬럼
ALTER TABLE personal_curriculum
  ADD COLUMN IF NOT EXISTS detail_text TEXT,
  ADD COLUMN IF NOT EXISTS link_2 TEXT;

COMMENT ON COLUMN personal_curriculum.detail_text IS '세부내용 (8회기 등)';
COMMENT ON COLUMN personal_curriculum.link_2 IS '두 번째 링크 (최대 2개 중 link_2)';
