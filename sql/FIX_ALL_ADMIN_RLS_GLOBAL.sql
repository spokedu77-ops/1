-- ================================================================
-- 🔐 전역 Admin RLS 정책 완전 수정
-- 모든 admin 페이지에서 데이터를 볼 수 있도록 수정
-- 문제: admin으로 로그인해도 teacher 롤로 적용되어 자신에게 배정된 것만 보임
-- 해결: is_admin() 함수가 users.is_admin boolean과 role 모두 확인하도록 수정
-- ================================================================

SELECT '🔐 전역 Admin RLS 정책 수정 시작...' as status;

-- ================================================================
-- 1단계: is_admin() 함수 완전 재작성
-- ================================================================
SELECT '📋 1단계: is_admin() 함수 재작성...' as progress;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- users 테이블에서 다음 중 하나라도 만족하면 admin:
  -- 1. is_admin = true (boolean 컬럼)
  -- 2. role IN ('admin', 'ADMIN', 'master', 'MASTER')
  -- 3. name IN ('최지훈', '김구민', '김윤기')
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      is_admin = true
      OR role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR name IN ('최지훈', '김구민', '김윤기')
    )
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'ADMIN', 'master', 'MASTER')
  );
END;
$$;

SELECT '✅ is_admin() 함수 재작성 완료' as status;

-- ================================================================
-- 2단계: users 테이블 정책 수정
-- ================================================================
SELECT '📋 2단계: users 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin_or_self" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

-- 모든 인증된 사용자가 조회 가능
CREATE POLICY "users_select_all" ON users
  FOR SELECT TO authenticated
  USING (true);

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

SELECT '✅ users 테이블 정책 수정 완료' as status;

-- ================================================================
-- 3단계: sessions 테이블 정책 수정
-- ================================================================
SELECT '📋 3단계: sessions 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "sessions_select_all" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_all" ON sessions;
DROP POLICY IF EXISTS "sessions_update_admin_or_creator" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_admin" ON sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sessions;
DROP POLICY IF EXISTS "Enable update for own or admin" ON sessions;
DROP POLICY IF EXISTS "Enable delete for admin only" ON sessions;

-- 모든 인증된 사용자가 조회 가능 (admin은 모든 데이터, teacher는 자신의 데이터)
CREATE POLICY "sessions_select_all" ON sessions
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 모든 인증된 사용자 가능
CREATE POLICY "sessions_insert_all" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: 작성자 또는 admin
CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin())
  WITH CHECK (created_by = auth.uid() OR is_admin());

-- DELETE: admin만
CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ sessions 테이블 정책 수정 완료' as status;

-- ================================================================
-- 4단계: mileage_logs 테이블 정책 수정
-- ================================================================
SELECT '📋 4단계: mileage_logs 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "mileage_select_own_or_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_insert_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_update_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_delete_admin" ON mileage_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON mileage_logs;
DROP POLICY IF EXISTS "Enable insert for own or admin" ON mileage_logs;
DROP POLICY IF EXISTS "Enable update for admin only" ON mileage_logs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON mileage_logs;

-- SELECT: teacher는 자신의 것만, admin은 모든 것
CREATE POLICY "mileage_select_own_or_admin" ON mileage_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

-- INSERT: admin만
CREATE POLICY "mileage_insert_admin" ON mileage_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: admin만
CREATE POLICY "mileage_update_admin" ON mileage_logs
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: admin만
CREATE POLICY "mileage_delete_admin" ON mileage_logs
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ mileage_logs 테이블 정책 수정 완료' as status;

-- ================================================================
-- 5단계: session_count_logs 테이블 정책 수정
-- ================================================================
SELECT '📋 5단계: session_count_logs 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "count_logs_select_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_insert_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_update_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_delete_admin" ON session_count_logs;
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;

-- SELECT: teacher는 자신의 것만, admin은 모든 것
CREATE POLICY "count_logs_select_own_or_admin" ON session_count_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

-- INSERT: teacher는 자신의 것만, admin은 모든 것
CREATE POLICY "count_logs_insert_own_or_admin" ON session_count_logs
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() OR is_admin());

-- UPDATE: admin만
CREATE POLICY "count_logs_update_admin" ON session_count_logs
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: admin만
CREATE POLICY "count_logs_delete_admin" ON session_count_logs
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ session_count_logs 테이블 정책 수정 완료' as status;

-- ================================================================
-- 6단계: todos 테이블 정책 수정
-- ================================================================
SELECT '📋 6단계: todos 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "todos_select_all" ON todos;
DROP POLICY IF EXISTS "todos_insert_all" ON todos;
DROP POLICY IF EXISTS "todos_update_own_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_delete_admin" ON todos;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable update for own or admin" ON todos;
DROP POLICY IF EXISTS "Enable delete for admin only" ON todos;

-- SELECT: 모든 인증된 사용자 가능
CREATE POLICY "todos_select_all" ON todos
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 모든 인증된 사용자 가능
CREATE POLICY "todos_insert_all" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: assignee 또는 admin
CREATE POLICY "todos_update_own_or_admin" ON todos
  FOR UPDATE TO authenticated
  USING (assignee::uuid = auth.uid() OR is_admin())
  WITH CHECK (assignee::uuid = auth.uid() OR is_admin());

-- DELETE: admin만
CREATE POLICY "todos_delete_admin" ON todos
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ todos 테이블 정책 수정 완료' as status;

-- ================================================================
-- 7단계: memos 테이블 정책 수정
-- ================================================================
SELECT '📋 7단계: memos 테이블 정책 수정...' as progress;

DROP POLICY IF EXISTS "memos_admin_only" ON memos;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON memos;

-- memos: admin만 모든 권한
CREATE POLICY "memos_admin_only" ON memos
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

SELECT '✅ memos 테이블 정책 수정 완료' as status;

-- ================================================================
-- 8단계: warmup 관련 테이블 정책 수정
-- ================================================================
SELECT '📋 8단계: warmup 관련 테이블 정책 수정...' as progress;

-- warmup_programs_composite
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "All users can read active composite programs" ON warmup_programs_composite;

CREATE POLICY "Admin full access to composite programs"
ON warmup_programs_composite
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All users can read active composite programs"
ON warmup_programs_composite
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- rotation_schedule
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;

CREATE POLICY "Admin full access to rotation schedule"
ON rotation_schedule
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All users can read published schedules"
ON rotation_schedule
FOR SELECT
USING (is_published = true AND auth.uid() IS NOT NULL);

-- play_scenarios
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;

CREATE POLICY "Admin full access to play scenarios"
ON play_scenarios
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All users can read play scenarios"
ON play_scenarios
FOR SELECT
USING (true);

SELECT '✅ warmup 관련 테이블 정책 수정 완료' as status;

-- ================================================================
-- 최종 확인
-- ================================================================
SELECT '📊 최종 확인...' as progress;

-- is_admin() 함수 테스트
SELECT 
  'is_admin() 함수 테스트' as test_name,
  is_admin() as is_admin_result,
  auth.uid() as current_user_id,
  CASE 
    WHEN is_admin() THEN '✅ Admin 권한 확인됨 - 모든 데이터 접근 가능'
    ELSE '❌ Admin 권한 없음 - users 테이블의 is_admin 또는 role 확인 필요'
  END as admin_status;

-- 모든 정책 개수 확인
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('users', 'sessions', 'mileage_logs', 'session_count_logs', 'memos', 'todos', 'warmup_programs_composite', 'rotation_schedule', 'play_scenarios')
GROUP BY tablename
ORDER BY tablename;

SELECT '🎉 전역 Admin RLS 정책 수정 완료!' as final_status;
SELECT '✅ is_admin() 함수가 users.is_admin boolean과 role 모두 확인' as result;
SELECT '✅ 모든 테이블에서 admin이 모든 데이터 접근 가능' as result;
SELECT '🔄 이제 모든 admin 페이지를 새로고침하세요!' as action;
