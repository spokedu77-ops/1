-- =====================================================
-- 🔧 Admin Classes 페이지 수정 (JOIN 문제 해결)
-- =====================================================

SELECT '🔧 Admin Classes 페이지 수정 시작...' as status;

-- ===== 문제 진단 =====
-- users 정책에서 서브쿼리가 자기 자신을 참조하면 JOIN 시 문제 발생
-- 해결: SECURITY DEFINER 함수로 role 체크 또는 정책 단순화

-- ===== 1단계: users 테이블 정책 재설정 (단순화) =====
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin_or_self" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- 모든 인증된 사용자가 조회 가능 (서브쿼리 없음)
CREATE POLICY "users_select_all" ON users
  FOR SELECT TO authenticated
  USING (true);

-- admin 체크 함수 생성 (SECURITY DEFINER로 순환 참조 방지)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master')
  );
END;
$$;

-- INSERT: admin만
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: 자기 자신 또는 admin
CREATE POLICY "users_update_admin_or_self" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- DELETE: admin만
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ users 정책 수정 완료' as status;

-- ===== 2단계: 다른 테이블 정책도 함수 사용으로 변경 =====

-- sessions 테이블
DROP POLICY IF EXISTS "sessions_select_all" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_all" ON sessions;
DROP POLICY IF EXISTS "sessions_update_admin_or_creator" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_admin" ON sessions;

CREATE POLICY "sessions_select_all" ON sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sessions_insert_all" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin())
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ sessions 정책 수정 완료' as status;

-- mileage_logs 테이블
DROP POLICY IF EXISTS "mileage_select_own_or_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_insert_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_update_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_delete_admin" ON mileage_logs;

CREATE POLICY "mileage_select_own_or_admin" ON mileage_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "mileage_insert_admin" ON mileage_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "mileage_update_admin" ON mileage_logs
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "mileage_delete_admin" ON mileage_logs
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ mileage_logs 정책 수정 완료' as status;

-- session_count_logs 테이블
DROP POLICY IF EXISTS "count_logs_select_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_insert_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_update_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_delete_admin" ON session_count_logs;

CREATE POLICY "count_logs_select_own_or_admin" ON session_count_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "count_logs_insert_own_or_admin" ON session_count_logs
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "count_logs_update_admin" ON session_count_logs
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "count_logs_delete_admin" ON session_count_logs
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ session_count_logs 정책 수정 완료' as status;

-- memos 테이블
DROP POLICY IF EXISTS "memos_admin_only" ON memos;

CREATE POLICY "memos_admin_only" ON memos
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

SELECT '✅ memos 정책 수정 완료' as status;

-- todos 테이블
DROP POLICY IF EXISTS "todos_select_all" ON todos;
DROP POLICY IF EXISTS "todos_insert_all" ON todos;
DROP POLICY IF EXISTS "todos_update_own_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_delete_admin" ON todos;

CREATE POLICY "todos_select_all" ON todos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "todos_insert_all" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "todos_update_own_or_admin" ON todos
  FOR UPDATE TO authenticated
  USING (assignee::uuid = auth.uid() OR is_admin())
  WITH CHECK (assignee::uuid = auth.uid() OR is_admin());

CREATE POLICY "todos_delete_admin" ON todos
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ todos 정책 수정 완료' as status;

-- ===== 최종 확인 =====
SELECT '📊 정책 확인...' as progress;

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('users', 'sessions', 'mileage_logs', 'session_count_logs', 'memos', 'todos')
GROUP BY tablename
ORDER BY tablename;

SELECT '🎉 Admin Classes 페이지 수정 완료!' as final_status;
SELECT '✅ 순환 참조 문제 해결 (SECURITY DEFINER 함수 사용)' as result;
SELECT '✅ JOIN 쿼리 정상 작동 예상' as result;
SELECT '🔄 이제 페이지 새로고침하세요!' as action;
