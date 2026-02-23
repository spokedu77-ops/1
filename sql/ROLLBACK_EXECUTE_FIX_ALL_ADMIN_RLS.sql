-- ================================================================
-- 롤백: EXECUTE_FIX_ALL_ADMIN_RLS.sql 실행 후 상태 복원
-- is_admin() 대신 role 기반, USING(true)/WITH CHECK(true) 없음 → 경고 증가 방지
-- ================================================================

SELECT '🔄 EXECUTE_FIX_ALL_ADMIN_RLS 롤백 시작...' as status;

-- ===== 1단계: EXECUTE_FIX가 만든 정책 전부 DROP =====
SELECT '📋 1단계: 정책 제거...' as progress;

-- users
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin_or_self" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- sessions
DROP POLICY IF EXISTS "sessions_select_all" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_all" ON sessions;
DROP POLICY IF EXISTS "sessions_select_own_or_admin" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_creator_or_admin" ON sessions;
DROP POLICY IF EXISTS "sessions_update_admin_or_creator" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_admin" ON sessions;

-- mileage_logs
DROP POLICY IF EXISTS "mileage_select_own_or_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_insert_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_update_admin" ON mileage_logs;
DROP POLICY IF EXISTS "mileage_delete_admin" ON mileage_logs;

-- session_count_logs
DROP POLICY IF EXISTS "count_logs_select_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_insert_own_or_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_update_admin" ON session_count_logs;
DROP POLICY IF EXISTS "count_logs_delete_admin" ON session_count_logs;

-- todos
DROP POLICY IF EXISTS "todos_select_all" ON todos;
DROP POLICY IF EXISTS "todos_insert_all" ON todos;
DROP POLICY IF EXISTS "todos_select_own_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_insert_assignee_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_update_own_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_delete_admin" ON todos;

-- memos
DROP POLICY IF EXISTS "memos_admin_only" ON memos;

-- warmup
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "All users can read active composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "warmup_composite_select" ON warmup_programs_composite;
DROP POLICY IF EXISTS "warmup_composite_admin_insert" ON warmup_programs_composite;
DROP POLICY IF EXISTS "warmup_composite_admin_update" ON warmup_programs_composite;
DROP POLICY IF EXISTS "warmup_composite_admin_delete" ON warmup_programs_composite;
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_select" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_insert" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_update" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_delete" ON rotation_schedule;
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_select" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_insert" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_update" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_delete" ON play_scenarios;

-- chat
DROP POLICY IF EXISTS "chat_rooms_all" ON chat_rooms;
DROP POLICY IF EXISTS "chat_messages_all" ON chat_messages;
DROP POLICY IF EXISTS "chat_participants_all" ON chat_participants;
DROP POLICY IF EXISTS "chat_rooms_admin_only" ON chat_rooms;
DROP POLICY IF EXISTS "chat_messages_admin_only" ON chat_messages;
DROP POLICY IF EXISTS "chat_participants_admin_only" ON chat_participants;

SELECT '✅ 정책 제거 완료' as status;

-- ===== 2단계: role 기반 정책으로 복원 (PROPER_RLS_FIX 패턴, is_admin() 미사용) =====
SELECT '📋 2단계: role 기반 정책 생성...' as progress;

-- users (USING true 없음)
CREATE POLICY "users_select_all" ON users
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "users_update_admin_or_self" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- sessions (USING/WITH CHECK true 없음)
CREATE POLICY "sessions_select_own_or_admin" ON sessions
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "sessions_insert_creator_or_admin" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- mileage_logs
CREATE POLICY "mileage_select_own_or_admin" ON mileage_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "mileage_insert_admin" ON mileage_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "mileage_update_admin" ON mileage_logs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "mileage_delete_admin" ON mileage_logs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- session_count_logs
CREATE POLICY "count_logs_select_own_or_admin" ON session_count_logs
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "count_logs_insert_own_or_admin" ON session_count_logs
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "count_logs_update_admin" ON session_count_logs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "count_logs_delete_admin" ON session_count_logs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- todos (USING/WITH CHECK true 없음)
CREATE POLICY "todos_select_own_or_admin" ON todos
  FOR SELECT TO authenticated
  USING (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "todos_insert_assignee_or_admin" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "todos_update_own_or_admin" ON todos
  FOR UPDATE TO authenticated
  USING (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "todos_delete_admin" ON todos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- memos
CREATE POLICY "memos_admin_only" ON memos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- warmup_programs_composite (SELECT 1개만 → Multiple Permissive 방지)
CREATE POLICY "warmup_composite_select" ON warmup_programs_composite
  FOR SELECT TO authenticated
  USING ((is_active = true AND auth.uid() IS NOT NULL) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "warmup_composite_admin_insert" ON warmup_programs_composite FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "warmup_composite_admin_update" ON warmup_programs_composite FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "warmup_composite_admin_delete" ON warmup_programs_composite FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- rotation_schedule (SELECT 1개만)
CREATE POLICY "rotation_schedule_select" ON rotation_schedule
  FOR SELECT TO authenticated
  USING ((is_published = true AND auth.uid() IS NOT NULL) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "rotation_schedule_admin_insert" ON rotation_schedule FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "rotation_schedule_admin_update" ON rotation_schedule FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "rotation_schedule_admin_delete" ON rotation_schedule FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- play_scenarios (SELECT 1개, true 없음)
CREATE POLICY "play_scenarios_select" ON play_scenarios
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "play_scenarios_admin_insert" ON play_scenarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "play_scenarios_admin_update" ON play_scenarios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "play_scenarios_admin_delete" ON play_scenarios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- chat (채팅 미사용 → 정책 1개, admin만, true 없음)
CREATE POLICY "chat_rooms_admin_only" ON chat_rooms
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "chat_messages_admin_only" ON chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "chat_participants_admin_only" ON chat_participants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ 롤백 완료 (role 기반 정책으로 복원)' as status;
SELECT '🎉 EXECUTE_FIX_ALL_ADMIN_RLS 롤백 완료. Performance 경고 확인하세요.' as final_status;
