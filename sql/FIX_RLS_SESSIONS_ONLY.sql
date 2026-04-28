-- ================================================================
-- sessions 전용 RLS: Auth 1회 평가 + 액션당 정책 1개
-- SELECT/INSERT/UPDATE/DELETE 4개. 다른 테이블은 건드리지 않음.
-- ================================================================

SELECT '🔧 sessions RLS 전용 수정...' as status;

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

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'sessions'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON sessions';
  END LOOP;
END $$;

CREATE POLICY "sessions_select_one" ON sessions
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "sessions_insert_one" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "sessions_update_one" ON sessions
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()))
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "sessions_delete_one" ON sessions
  FOR DELETE TO authenticated
  USING ((SELECT private.rls_is_admin()));

SELECT '✅ sessions 정책 적용 (SELECT/INSERT/UPDATE/DELETE 각 1개)' as status;
