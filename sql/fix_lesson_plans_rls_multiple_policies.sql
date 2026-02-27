-- =====================================================
-- lesson_plans RLS: Multiple Permissive Policies 해소
-- =====================================================
-- 이슈: SELECT에 lesson_plans_select, lesson_plans_select_one 중복
-- 해결: 액션당 정책 1개만 유지 + auth.uid() 1회 평가
-- =====================================================

-- 기존 정책 전부 제거
DROP POLICY IF EXISTS "lesson_plans_select" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_select_one" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_admin" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_insert" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_update" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_delete" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_delete" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_insert" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_update" ON public.lesson_plans;

-- 1) SELECT: 선생님(본인 session) 또는 관리자
CREATE POLICY "lesson_plans_select_one" ON public.lesson_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = lesson_plans.session_id
        AND s.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true)
    )
  );

-- 2) INSERT: 선생님 본인 session에만
CREATE POLICY "lesson_plans_insert_one" ON public.lesson_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = lesson_plans.session_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

-- 3) UPDATE: 선생님 본인 session만 (기존과 동일)
CREATE POLICY "lesson_plans_update_one" ON public.lesson_plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = lesson_plans.session_id
        AND s.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = lesson_plans.session_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

-- 4) DELETE: 선생님 본인 session만 (기존과 동일)
CREATE POLICY "lesson_plans_delete_one" ON public.lesson_plans
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = lesson_plans.session_id
        AND s.created_by = (SELECT auth.uid())
    )
  );
