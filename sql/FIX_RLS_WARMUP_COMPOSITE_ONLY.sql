-- ================================================================
-- warmup_programs_composite 전용 RLS: 액션당 정책 1개 (Multiple Permissive 제거)
-- SELECT/INSERT/UPDATE/DELETE 4개 합쳐서 이 테이블만 수정. 다른 테이블은 건드리지 않음.
-- ================================================================

SELECT '🔧 warmup_programs_composite RLS 전용 수정...' as status;

-- rls_is_admin() 없으면 정의 (이미 있으면 교체)
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

-- 기존 정책 전부 제거 (composite_admin_*, warmup_composite_* 등 이름 무관)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'warmup_programs_composite'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON warmup_programs_composite';
  END LOOP;
END $$;

-- 액션당 정책 1개 (Auth 1회 평가)
CREATE POLICY "warmup_composite_select_one" ON warmup_programs_composite
  FOR SELECT TO authenticated
  USING (
    (is_active = true AND (SELECT auth.uid()) IS NOT NULL)
    OR (SELECT private.rls_is_admin())
  );

CREATE POLICY "warmup_composite_insert_one" ON warmup_programs_composite
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.rls_is_admin()));

CREATE POLICY "warmup_composite_update_one" ON warmup_programs_composite
  FOR UPDATE TO authenticated
  USING ((SELECT private.rls_is_admin())) WITH CHECK ((SELECT private.rls_is_admin()));

CREATE POLICY "warmup_composite_delete_one" ON warmup_programs_composite
  FOR DELETE TO authenticated
  USING ((SELECT private.rls_is_admin()));

SELECT '✅ warmup_programs_composite 정책 적용 (SELECT/INSERT/UPDATE/DELETE 각 1개)' as status;
