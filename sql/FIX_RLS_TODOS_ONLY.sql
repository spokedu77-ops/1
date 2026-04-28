-- ================================================================
-- todos 전용 RLS: Auth 1회 평가 + 액션당 정책 1개
-- SELECT/INSERT/UPDATE/DELETE 4개. 다른 테이블은 건드리지 않음.
-- ================================================================

SELECT '🔧 todos RLS 전용 수정...' as status;

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
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'todos'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON todos';
  END LOOP;
END $$;

CREATE POLICY "todos_select_one" ON todos
  FOR SELECT TO authenticated
  USING (assignee::uuid = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "todos_insert_one" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (assignee::uuid = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "todos_update_one" ON todos
  FOR UPDATE TO authenticated
  USING (assignee::uuid = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()))
  WITH CHECK (assignee::uuid = (SELECT auth.uid()) OR (SELECT private.rls_is_admin()));

CREATE POLICY "todos_delete_one" ON todos
  FOR DELETE TO authenticated
  USING ((SELECT private.rls_is_admin()));

SELECT '✅ todos 정책 적용 (SELECT/INSERT/UPDATE/DELETE 각 1개)' as status;
