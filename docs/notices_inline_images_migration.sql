-- notices 테이블에 inline_images 컬럼 추가 (줄 바로 아래 인라인 이미지)
-- Supabase SQL Editor에서 실행하세요.
--
-- 형식: [{ "after_line": 0, "url": "https://..." }, ...]
-- after_line: 0 = 첫 번째 줄 바로 아래, 1 = 두 번째 줄 바로 아래

ALTER TABLE notices
ADD COLUMN IF NOT EXISTS inline_images jsonb DEFAULT '[]'::jsonb;
