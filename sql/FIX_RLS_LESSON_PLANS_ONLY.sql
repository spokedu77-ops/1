-- ================================================================
-- lesson_plans 전용 RLS: Auth 1회 평가 + 액션당 정책 1개 (Multiple Permissive 제거)
-- Chat 테이블은 건드리지 않음. 수업안만 수정할 때 이 스크립트만 실행.
-- ================================================================

SELECT '🔧 lesson_plans RLS 전용 수정...' as status;

-- ========== STABLE 헬퍼 (Auth 경고 감소) ==========
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.rls_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.is_admin = true
      OR u.role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR u.name IN ('최지훈', '김구민', '김윤기')
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'ADMIN', 'master', 'MASTER')
  );
$$;

-- ========== LESSON_PLANS: 기존 전부 제거 후 1 SELECT + 선생님 쓰기만 ==========
DROP POLICY IF EXISTS lesson_plans_admin ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_teacher ON lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_select_one" ON lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_insert" ON lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_update" ON lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_delete" ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_delete ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_insert ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_update ON lesson_plans;

CREATE POLICY "lesson_plans_select_one" ON lesson_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  );

CREATE POLICY "lesson_plans_teacher_insert" ON lesson_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));
CREATE POLICY "lesson_plans_teacher_update" ON lesson_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));
CREATE POLICY "lesson_plans_teacher_delete" ON lesson_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));

SELECT '✅ lesson_plans 정책 적용 (운영진 role/name/is_admin 모두 조회 가능)' as status;
