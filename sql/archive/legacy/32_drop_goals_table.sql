-- ================================================================
-- public.goals 테이블 및 RLS 정책 제거
-- 앱에서 goals 테이블을 사용하지 않으며, 다중 permissive 정책 경고 제거용
-- Supabase SQL Editor에서 실행
-- ================================================================

DROP POLICY IF EXISTS "Admin and Master Access" ON public.goals;
DROP POLICY IF EXISTS "goals_admin_exclusive_policy" ON public.goals;

DROP TABLE IF EXISTS public.goals;

-- ================================================================
SELECT 'Goals table and policies (32) dropped.' AS status;
