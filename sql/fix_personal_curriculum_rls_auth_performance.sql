-- =====================================================
-- personal_curriculum RLS: auth.uid() 1회 평가로 성능 개선
-- =====================================================
-- 이슈: auth.uid() 또는 is_admin() 내부 auth 호출이 행마다 재평가됨
-- 해결: (SELECT auth.uid()), (SELECT is_admin()) 로 치환
-- =====================================================

-- 기존 정책 전부 제거
DROP POLICY IF EXISTS "personal_curriculum_select_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_select_authenticated" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_admin_all" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_insert_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_update_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_delete_one" ON public.personal_curriculum;

-- 1) SELECT: 인증된 사용자만 조회 (선생님 포함)
CREATE POLICY "personal_curriculum_select_one" ON public.personal_curriculum
  FOR SELECT TO authenticated
  USING (true);

-- 2) INSERT: 관리자만
CREATE POLICY "personal_curriculum_insert_one" ON public.personal_curriculum
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- 3) UPDATE: 관리자만
CREATE POLICY "personal_curriculum_update_one" ON public.personal_curriculum
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- 4) DELETE: 관리자만
CREATE POLICY "personal_curriculum_delete_one" ON public.personal_curriculum
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
