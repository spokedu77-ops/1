-- =====================================================
-- users RLS: auth.uid() 1회 평가로 성능 개선
-- =====================================================
-- 이슈: auth.uid()가 행마다 재평가되어 users 테이블 쿼리 성능 저하
-- 해결: auth.uid() → (SELECT auth.uid()) 로 치환 (쿼리당 1회만 평가)
--
-- Supabase SQL Editor에서 실행하세요.
-- 현재 정책 정의가 다르면, 먼저 아래로 확인 후 수정하세요:
--   SELECT polname, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as with_check
--   FROM pg_policy WHERE polrelid = 'public.users'::regclass;
-- =====================================================

-- 1) users_select_all (SELECT)
-- 기존이 USING (true) 였다면: USING (true) 유지 (auth 호출 없음)
-- 기존이 USING (auth.uid() IS NOT NULL) 였다면: 아래 사용
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 2) users_update_admin_or_self (UPDATE)
DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;
CREATE POLICY "users_update_admin_or_self" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true)
    )
  );
