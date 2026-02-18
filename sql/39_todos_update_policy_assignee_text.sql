-- todos.assignee는 앱에서 담당자 이름(Common, 최지훈, 김윤기 등)으로 저장됨.
-- 기존 정책은 assignee::uuid = auth.uid() 로 비교해서, "김윤기" 같은 문자열을
-- UUID로 캐스팅하다가 invalid input syntax for type uuid 오류 발생.
-- /admin 대시보드는 admin 전용이므로, 수정도 admin만 허용하도록 변경.

DROP POLICY IF EXISTS "todos_update_own_or_admin" ON todos;
DROP POLICY IF EXISTS "Enable update for own or admin" ON todos;

CREATE POLICY "todos_update_admin_only" ON todos
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
