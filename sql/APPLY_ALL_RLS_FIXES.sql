-- =====================================================
-- RLS 전체 수정 스크립트 (Supabase SQL Editor에서 한 번에 실행)
-- =====================================================
-- 적용 후 Supabase Security Advisor 경고 해소 예상:
--   - Auth RLS Initialization Plan (auth.uid() 1회 평가)
--   - Multiple Permissive Policies (액션당 정책 1개)
--   - RLS Policy Always True (memos, dashboard_memos → admin만)
--
-- 전제조건: is_admin() 함수 존재 (STORAGE_POLICIES.sql 또는 15_setup_complete_warmup_system.sql 참고)
-- memos 테이블 없으면 6번 섹션 주석 처리
-- =====================================================

-- ========== 0. dashboard_memos 테이블 (없으면 생성) ==========
CREATE TABLE IF NOT EXISTS dashboard_memos (
  board_id TEXT NOT NULL PRIMARY KEY,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dashboard_memos ENABLE ROW LEVEL SECURITY;
INSERT INTO dashboard_memos (board_id, content) VALUES
  ('Common', ''), ('최지훈', ''), ('김윤기', ''), ('김구민', '')
ON CONFLICT (board_id) DO NOTHING;

-- ========== 1. users ==========
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;
CREATE POLICY "users_update_admin_or_self" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true))
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true))
  );

-- ========== 2. session_count_logs ==========
DROP POLICY IF EXISTS "count_logs_select_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_insert_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_update_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_delete_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin" ON public.session_count_logs;

CREATE POLICY "count_logs_select_one" ON public.session_count_logs FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민')))
  );
CREATE POLICY "count_logs_insert_one" ON public.session_count_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))));
CREATE POLICY "count_logs_update_one" ON public.session_count_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))));
CREATE POLICY "count_logs_delete_one" ON public.session_count_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))));

-- ========== 3. mileage_logs ==========
DROP POLICY IF EXISTS "mileage_select_one" ON public.mileage_logs;
CREATE POLICY "mileage_select_one" ON public.mileage_logs FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민')))
  );

-- ========== 4. weekly_best ==========
DROP POLICY IF EXISTS "weekly_best_one" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_select_authenticated" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_admin_all" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_select_one" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_insert_one" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_update_one" ON public.weekly_best;
DROP POLICY IF EXISTS "weekly_best_delete_one" ON public.weekly_best;

CREATE POLICY "weekly_best_select_one" ON public.weekly_best FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_best_insert_one" ON public.weekly_best FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY "weekly_best_update_one" ON public.weekly_best FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY "weekly_best_delete_one" ON public.weekly_best FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ========== 5. lesson_plans ==========
DROP POLICY IF EXISTS "lesson_plans_select" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_select_one" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_admin" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_insert" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_update" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_teacher_delete" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_delete" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_insert" ON public.lesson_plans;
DROP POLICY IF EXISTS "lesson_plans_update" ON public.lesson_plans;

CREATE POLICY "lesson_plans_select_one" ON public.lesson_plans FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true))
  );
CREATE POLICY "lesson_plans_insert_one" ON public.lesson_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));
CREATE POLICY "lesson_plans_update_one" ON public.lesson_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));
CREATE POLICY "lesson_plans_delete_one" ON public.lesson_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = lesson_plans.session_id AND s.created_by = (SELECT auth.uid())));

-- ========== 6. memos ==========
DROP POLICY IF EXISTS "memos_admin_only" ON public.memos;
DROP POLICY IF EXISTS "Allow admin read access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin update access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON public.memos;

CREATE POLICY "memos_admin_only" ON public.memos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))));

-- ========== 7. dashboard_memos ==========
DROP POLICY IF EXISTS "dashboard_memos_admin_only" ON public.dashboard_memos;
DROP POLICY IF EXISTS "dashboard_memos_all" ON public.dashboard_memos;

CREATE POLICY "dashboard_memos_admin_only" ON public.dashboard_memos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))));

-- ========== 8. personal_curriculum ==========
DROP POLICY IF EXISTS "personal_curriculum_select_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_select_authenticated" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_admin_all" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_insert_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_update_one" ON public.personal_curriculum;
DROP POLICY IF EXISTS "personal_curriculum_delete_one" ON public.personal_curriculum;

CREATE POLICY "personal_curriculum_select_one" ON public.personal_curriculum FOR SELECT TO authenticated USING (true);
CREATE POLICY "personal_curriculum_insert_one" ON public.personal_curriculum FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY "personal_curriculum_update_one" ON public.personal_curriculum FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY "personal_curriculum_delete_one" ON public.personal_curriculum FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ========== 9. todos ==========
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'todos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON todos', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "todos_select_admin" ON todos FOR SELECT TO authenticated USING ((SELECT is_admin()));
CREATE POLICY "todos_insert_admin" ON todos FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY "todos_update_admin" ON todos FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY "todos_delete_admin" ON todos FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ========== 완료 ==========
SELECT 'RLS 수정 완료' AS status;
