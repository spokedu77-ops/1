-- notices 테이블에 image_urls 컬럼 추가 (공지 사진 첨부용)
-- Supabase SQL Editor에서 실행하세요.
--
-- 공지 사진 업로드: 관리자 → 공지사항 → 새 공지 또는 편집 → 모달 맨 위 "사진 첨부"에서 추가 버튼

ALTER TABLE notices
ADD COLUMN IF NOT EXISTS image_urls text[];
