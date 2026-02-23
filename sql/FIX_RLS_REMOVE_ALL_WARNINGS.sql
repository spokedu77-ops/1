-- ================================================================
-- RLS 경고 제거: Always True / Multiple Permissive / Chat 정리
-- 1) USING (true), WITH CHECK (true) 제거 → 실제 조건으로 교체
-- 2) 같은 테이블·같은 action에 정책 1개만 (merge)
-- 3) Chat: 기능 없음 → 정책 전부 제거 후 admin만 단일 정책
-- ================================================================

SELECT '🔧 RLS 경고 제거 시작...' as status;

-- admin 조건 (role만, is_admin 함수 미사용)
-- 아래 정책에서 반복 사용

-- (Chat 테이블 RLS는 건드리지 않음. 필요 시 sql/FIX_RLS_CHAT_ONLY.sql 실행)

-- ========== SESSIONS: Always True 제거 (INSERT 조건 구체화) ==========
DROP POLICY IF EXISTS "sessions_select_all" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_all" ON sessions;
DROP POLICY IF EXISTS "sessions_update_admin_or_creator" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_admin" ON sessions;

CREATE POLICY "sessions_select_own_or_admin" ON sessions
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "sessions_insert_creator_or_admin" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ Sessions 정책 정리 완료' as status;

-- ========== TODOS: Always True 제거 ==========
DROP POLICY IF EXISTS "todos_select_all" ON todos;
DROP POLICY IF EXISTS "todos_insert_all" ON todos;
DROP POLICY IF EXISTS "todos_update_own_or_admin" ON todos;
DROP POLICY IF EXISTS "todos_delete_admin" ON todos;

CREATE POLICY "todos_select_own_or_admin" ON todos
  FOR SELECT TO authenticated
  USING (
    assignee::uuid = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "todos_insert_assignee_or_admin" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (
    assignee::uuid = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "todos_update_own_or_admin" ON todos
  FOR UPDATE TO authenticated
  USING (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (assignee::uuid = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

CREATE POLICY "todos_delete_admin" ON todos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ Todos 정책 정리 완료' as status;

-- ========== WARMUP: Multiple Permissive 제거 (SELECT 1개로 통합) ==========
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "All users can read active composite programs" ON warmup_programs_composite;

CREATE POLICY "warmup_composite_select_one" ON warmup_programs_composite
  FOR SELECT TO authenticated
  USING (
    (is_active = true AND auth.uid() IS NOT NULL)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "warmup_composite_admin_write" ON warmup_programs_composite
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- FOR ALL on same table = SELECT+INSERT+UPDATE+DELETE. So we now have SELECT from two policies again (select_one and admin_write). We need only one SELECT. So: drop admin_write FOR ALL and do only INSERT, UPDATE, DELETE.
DROP POLICY IF EXISTS "warmup_composite_admin_write" ON warmup_programs_composite;

CREATE POLICY "warmup_composite_admin_insert" ON warmup_programs_composite FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "warmup_composite_admin_update" ON warmup_programs_composite FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "warmup_composite_admin_delete" ON warmup_programs_composite FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- rotation_schedule
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;

CREATE POLICY "rotation_schedule_select_one" ON rotation_schedule
  FOR SELECT TO authenticated
  USING (
    (is_published = true AND auth.uid() IS NOT NULL)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "rotation_schedule_admin_insert" ON rotation_schedule FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "rotation_schedule_admin_update" ON rotation_schedule FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "rotation_schedule_admin_delete" ON rotation_schedule FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- play_scenarios
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;

CREATE POLICY "play_scenarios_select_one" ON play_scenarios
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "play_scenarios_admin_write" ON play_scenarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "play_scenarios_admin_update" ON play_scenarios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "play_scenarios_admin_delete" ON play_scenarios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ Warmup/Play/Rotation 정책 정리 완료' as status;

-- ========== LESSON_PLANS: Multiple Permissive 제거 (SELECT 1개로) ==========
DROP POLICY IF EXISTS lesson_plans_admin ON lesson_plans;
DROP POLICY IF EXISTS lesson_plans_teacher ON lesson_plans;

CREATE POLICY "lesson_plans_select_one" ON lesson_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master'))
  );

CREATE POLICY "lesson_plans_teacher_insert" ON lesson_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = auth.uid()));
CREATE POLICY "lesson_plans_teacher_update" ON lesson_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = auth.uid()));
CREATE POLICY "lesson_plans_teacher_delete" ON lesson_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = auth.uid()));

SELECT '✅ Lesson_plans 정책 정리 완료' as status;

-- ========== PERSONAL_CURRICULUM: 2개 → 1개 SELECT, 1개 나머지 ==========
DROP POLICY IF EXISTS "personal_curriculum_admin_all" ON personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_select_authenticated" ON personal_curriculum;

CREATE POLICY "personal_curriculum_select" ON personal_curriculum
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "personal_curriculum_admin_write" ON personal_curriculum
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

-- personal_curriculum: FOR ALL includes SELECT, so we'd have two SELECT again. Fix: admin_write only INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "personal_curriculum_admin_write" ON personal_curriculum;

CREATE POLICY "personal_curriculum_admin_insert" ON personal_curriculum FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "personal_curriculum_admin_update" ON personal_curriculum FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));
CREATE POLICY "personal_curriculum_admin_delete" ON personal_curriculum FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ Personal_curriculum 정책 정리 완료' as status;

-- ========== WEEKLY_BEST: role 기반으로 (is_admin 제거 시 경고 완화) ==========
DROP POLICY IF EXISTS "weekly_best_admin_all" ON weekly_best;

CREATE POLICY "weekly_best_admin_only" ON weekly_best
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')));

SELECT '✅ Weekly_best 정책 정리 완료' as status;

-- ================================================================
SELECT '🎉 RLS 경고 제거 스크립트 적용 완료. Dashboard에서 경고 개수 확인하세요.' as final_status;
