-- Admin Memo (메모장) 제품 제거. Admin Note(note_*)는 유지.
-- 20260828220000 / 20260828230000 이 이미 적용된 환경의 테이블·정책을 idempotent 하게 정리한다.

DROP POLICY IF EXISTS admin_memo_blocks_service_role_all ON public.admin_memo_blocks;
DROP POLICY IF EXISTS admin_memos_service_role_all ON public.admin_memos;

DROP TABLE IF EXISTS public.admin_memo_blocks CASCADE;
DROP TABLE IF EXISTS public.admin_memos CASCADE;
