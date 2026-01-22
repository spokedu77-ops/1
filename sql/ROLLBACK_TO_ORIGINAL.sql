-- =====================================================
-- 🔄 SQL 실행 전 상태로 완전 복원
-- =====================================================
-- 이 스크립트는 문제의 SQL 실행 전 상태로 되돌립니다

SELECT '🔄 원래 상태로 복원 시작...' as status;

-- ===== 1단계: 추가된 외래 키 제거 =====
SELECT '📋 1단계: 외래 키 제거...' as progress;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_created_by;
ALTER TABLE mileage_logs DROP CONSTRAINT IF EXISTS fk_mileage_logs_teacher_id;
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS fk_session_count_logs_teacher_id;
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS fk_session_count_logs_session_id;

SELECT '✅ 외래 키 제거 완료' as status;

-- ===== 2단계: 새로 추가된 인덱스 제거 =====
SELECT '📋 2단계: 인덱스 제거...' as progress;

-- sessions 테이블
DROP INDEX IF EXISTS idx_sessions_created_by;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_group_id;
DROP INDEX IF EXISTS idx_sessions_start_at;
DROP INDEX IF EXISTS idx_sessions_end_at;
DROP INDEX IF EXISTS idx_sessions_session_type;
DROP INDEX IF EXISTS idx_sessions_start_status;

-- mileage_logs 테이블
DROP INDEX IF EXISTS idx_mileage_logs_teacher_id;
DROP INDEX IF EXISTS idx_mileage_logs_created_at;
DROP INDEX IF EXISTS idx_mileage_logs_teacher_created;

-- session_count_logs 테이블
DROP INDEX IF EXISTS idx_session_count_logs_teacher_id;
DROP INDEX IF EXISTS idx_session_count_logs_created_at;
DROP INDEX IF EXISTS idx_session_count_logs_teacher_created;

-- users 테이블
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_name;
DROP INDEX IF EXISTS idx_users_active_name;
DROP INDEX IF EXISTS idx_users_role;

-- memos 테이블
DROP INDEX IF EXISTS idx_memos_assignee;

-- todos 테이블
DROP INDEX IF EXISTS idx_todos_assignee;
DROP INDEX IF EXISTS idx_todos_status;
DROP INDEX IF EXISTS idx_todos_created_at;

SELECT '✅ 인덱스 제거 완료' as status;

-- ===== 3단계: 변경된 RLS 정책 제거 =====
SELECT '📋 3단계: 변경된 정책 제거...' as progress;

-- users 테이블
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_insert_admin_only" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_admin_only" ON users;
DROP POLICY IF EXISTS "users_read_all" ON users;
DROP POLICY IF EXISTS "users_insert_all" ON users;
DROP POLICY IF EXISTS "users_update_all" ON users;

-- session_count_logs
DROP POLICY IF EXISTS "Enable insert for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin only" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON session_count_logs;
DROP POLICY IF EXISTS "session_count_logs_all_access" ON session_count_logs;

-- memos
DROP POLICY IF EXISTS "Allow admin read access" ON memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON memos;
DROP POLICY IF EXISTS "Allow admin update access" ON memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON memos;
DROP POLICY IF EXISTS "memos_all_access" ON memos;

SELECT '✅ 변경된 정책 제거 완료' as status;

-- ===== 4단계: 원래 정책 복원 (프로젝트에 원래 있던 정책들) =====
SELECT '📋 4단계: 원래 정책 복원...' as progress;

-- users 테이블 - 원래 정책 복원
CREATE POLICY "Enable read access for all users" ON users 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "users see self" ON users 
  FOR SELECT TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "users_admin_all" ON users 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.name IN ('최지훈', '김윤기', '김구민')));

-- session_count_logs - 원래 정책 복원
CREATE POLICY "Admin full access to session count logs" ON session_count_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.name IN ('최지훈', '김윤기', '김구민')));

CREATE POLICY "Teachers can view own count logs" ON session_count_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- memos - 원래 정책 복원
CREATE POLICY "Enable read access for authenticated users" ON memos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON memos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON memos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON memos
  FOR DELETE TO authenticated
  USING (true);

SELECT '✅ 원래 정책 복원 완료' as status;

-- ===== 5단계: RLS 상태 확인 =====
SELECT '📋 5단계: RLS 상태 확인...' as progress;

-- RLS가 활성화되어 있는지 확인
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS 활성화 ✅'
    ELSE 'RLS 비활성화 ⚠️'
  END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'mileage_logs', 'session_count_logs', 'memos', 'todos')
ORDER BY tablename;

-- ===== 6단계: 데이터 확인 =====
SELECT '📊 데이터 확인...' as status;

SELECT 'users 테이블' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'sessions 테이블', COUNT(*) FROM sessions
UNION ALL
SELECT 'mileage_logs 테이블', COUNT(*) FROM mileage_logs
UNION ALL
SELECT 'session_count_logs 테이블', COUNT(*) FROM session_count_logs
UNION ALL
SELECT 'memos 테이블', COUNT(*) FROM memos;

-- ===== 7단계: 정책 개수 확인 =====
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('users', 'memos', 'session_count_logs')
GROUP BY tablename
ORDER BY tablename;

SELECT '🎉 원래 상태로 복원 완료!' as final_status;
SELECT '✅ SQL 실행 전 상태로 되돌렸습니다' as result;
SELECT '⚠️  만약 데이터가 손실되었다면 Supabase 백업 복원이 필요합니다' as note;
