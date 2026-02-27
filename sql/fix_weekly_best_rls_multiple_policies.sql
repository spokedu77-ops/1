-- =====================================================
-- weekly_best RLS: Multiple Permissive Policies 해소
-- =====================================================
-- 이슈: SELECT에 weekly_best_one, weekly_best_select_authenticated 중복
-- 해결: 액션당 정책 1개만 유지
-- =====================================================

-- 기존 정책 전부 제거
DROP POLICY IF EXISTS "weekly_best_one" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_select_authenticated" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_admin_all" ON public.weekly_best;

-- 1) SELECT: 인증된 사용자만 조회 (선생님 포함)
CREATE POLICY "weekly_best_select_one" ON public.weekly_best
  FOR SELECT TO authenticated
  USING (true);

-- 2) INSERT: 관리자만 (SELECT로 1회 평가)
CREATE POLICY "weekly_best_insert_one" ON public.weekly_best
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- 3) UPDATE: 관리자만
CREATE POLICY "weekly_best_update_one" ON public.weekly_best
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- 4) DELETE: 관리자만
CREATE POLICY "weekly_best_delete_one" ON public.weekly_best
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
