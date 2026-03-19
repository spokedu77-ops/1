-- =============================================================
-- 57_drop_users_vacation.sql
-- 목적: 강사 관리에서 제거한 `users.vacation`(연기 요청 텍스트)
--       더 이상 사용하지 않으므로 컬럼을 삭제합니다.
-- =============================================================

ALTER TABLE public.users
  DROP COLUMN IF EXISTS vacation;

-- 검증
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'vacation';
-- 결과가 0행이면 정상 삭제됨

