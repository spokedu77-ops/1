-- =====================================================
-- todos "invalid input syntax for type uuid: Common" 수정
-- todos.assignee는 문자열(Common, 최지훈 등)인데, 기존 RLS 정책이 assignee::uuid로 캐스팅해서 에러 발생
-- Supabase SQL 에디터에서 실행
-- =====================================================

-- 기존 todos 정책 전부 삭제 (assignee::uuid 사용하는 정책 제거)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'todos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON todos', pol.policyname);
  END LOOP;
END $$;

-- admin만 todos 전체 접근 (assignee 캐스팅 없음, SELECT로 1회 평가)
CREATE POLICY "todos_select_admin" ON todos FOR SELECT TO authenticated USING ((SELECT is_admin()));
CREATE POLICY "todos_insert_admin" ON todos FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY "todos_update_admin" ON todos FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY "todos_delete_admin" ON todos FOR DELETE TO authenticated USING ((SELECT is_admin()));
