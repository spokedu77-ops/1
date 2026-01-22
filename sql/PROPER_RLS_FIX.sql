-- =====================================================
-- 🔐 제대로 된 RLS 정책 설정 (한 번에 완료)
-- =====================================================
-- admin은 모든 권한, teacher는 자기 것만 접근

SELECT '🔐 RLS 정책 재설정 시작...' as status;

-- ===== 1단계: 기존 문제 정책 모두 제거 =====
SELECT '📋 1단계: 기존 정책 제거...' as progress;

-- users 테이블 정책 제거
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "users see self" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_self_read" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;
DROP POLICY IF EXISTS "users_insert_admin_only" ON users;
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_admin_only" ON users;
DROP POLICY IF EXISTS "users_read_all" ON users;
DROP POLICY IF EXISTS "users_insert_all" ON users;
DROP POLICY IF EXISTS "users_update_all" ON users;

-- sessions 테이블 정책 제거
DROP POLICY IF EXISTS "Enable read access for all users" ON sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sessions;
DROP POLICY IF EXISTS "Enable update for own or admin" ON sessions;
DROP POLICY IF EXISTS "Enable delete for admin only" ON sessions;

-- mileage_logs 테이블 정책 제거
DROP POLICY IF EXISTS "Enable read for own or admin" ON mileage_logs;
DROP POLICY IF EXISTS "Enable insert for own or admin" ON mileage_logs;
DROP POLICY IF EXISTS "Enable update for admin only" ON mileage_logs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON mileage_logs;

-- session_count_logs 테이블 정책 제거
DROP POLICY IF EXISTS "Admin full access to session count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Teachers can view own count logs" ON session_count_logs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for system" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable insert for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin only" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON session_count_logs;
DROP POLICY IF EXISTS "session_count_logs_all_access" ON session_count_logs;

-- memos 테이블 정책 제거
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON memos;
DROP POLICY IF EXISTS "Allow admin read access" ON memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON memos;
DROP POLICY IF EXISTS "Allow admin update access" ON memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON memos;
DROP POLICY IF EXISTS "memos_all_access" ON memos;

-- todos 테이블 정책 제거
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable update for own or admin" ON todos;
DROP POLICY IF EXISTS "Enable delete for admin only" ON todos;

SELECT '✅ 기존 정책 제거 완료' as status;

-- ===== 2단계: 제대로 된 RLS 정책 생성 =====
SELECT '📋 2단계: 새 정책 생성...' as progress;

-- ========================================
-- users 테이블: 모두 조회 가능, admin만 수정
-- ========================================
CREATE POLICY "users_select_all" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "users_update_admin_or_self" ON users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- sessions 테이블: 모두 조회, admin이나 작성자만 수정
-- ========================================
CREATE POLICY "sessions_select_all" ON sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sessions_insert_all" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- mileage_logs 테이블: admin 전체 접근, teacher는 자기 것만 조회
-- ========================================
CREATE POLICY "mileage_select_own_or_admin" ON mileage_logs
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "mileage_insert_admin" ON mileage_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "mileage_update_admin" ON mileage_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "mileage_delete_admin" ON mileage_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- session_count_logs 테이블: admin 전체, teacher는 자기 것만
-- ========================================
CREATE POLICY "count_logs_select_own_or_admin" ON session_count_logs
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "count_logs_insert_own_or_admin" ON session_count_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "count_logs_update_admin" ON session_count_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "count_logs_delete_admin" ON session_count_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- memos 테이블: admin만 모든 작업 가능
-- ========================================
CREATE POLICY "memos_admin_only" ON memos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- todos 테이블: 모두 조회, 자기 것 수정, admin은 모든 작업
-- ========================================
CREATE POLICY "todos_select_all" ON todos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "todos_insert_all" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "todos_update_own_or_admin" ON todos
  FOR UPDATE TO authenticated
  USING (
    assignee::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    assignee::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

CREATE POLICY "todos_delete_admin" ON todos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'master')
    )
  );

-- ========================================
-- chat 관련 테이블: 기본적으로 모든 인증 사용자 접근 가능
-- ========================================
CREATE POLICY "chat_rooms_all" ON chat_rooms
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_messages_all" ON chat_messages
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_participants_all" ON chat_participants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '✅ 새 정책 생성 완료' as status;

-- ===== 3단계: RLS 활성화 =====
SELECT '📋 3단계: RLS 활성화...' as progress;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_count_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS 활성화 완료' as status;

-- ===== 4단계: 정책 확인 =====
SELECT '📊 정책 확인 중...' as progress;

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT(조회)'
    WHEN cmd = 'INSERT' THEN 'INSERT(추가)'
    WHEN cmd = 'UPDATE' THEN 'UPDATE(수정)'
    WHEN cmd = 'DELETE' THEN 'DELETE(삭제)'
    WHEN cmd = 'ALL' THEN 'ALL(전체)'
  END as operation
FROM pg_policies 
WHERE tablename IN ('users', 'sessions', 'mileage_logs', 'session_count_logs', 'memos', 'todos', 'chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY tablename, cmd;

-- ===== 최종 확인 =====
SELECT '🎉 RLS 정책 재설정 완료!' as final_status;
SELECT '✅ admin/master: 모든 권한' as result;
SELECT '✅ teacher: 자기 데이터만 접근' as result;
SELECT '✅ 모든 사용자: 기본 조회 가능' as result;
SELECT '🔐 보안 활성화됨' as security_status;
