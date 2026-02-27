-- =====================================================
-- session_count_logs RLS: auth.uid() 1회 평가로 성능 개선
-- =====================================================
-- 이슈: auth.uid()가 행마다 재평가되어 쿼리 성능 저하
-- 해결: auth.uid() → (SELECT auth.uid()) 로 치환
--
-- 현재 정책 확인:
--   SELECT polname FROM pg_policy WHERE polrelid = 'public.session_count_logs'::regclass;
-- =====================================================

-- 기존 정책 전부 제거 (액션당 1개만 유지 - Multiple Permissive 해소)
DROP POLICY IF EXISTS "count_logs_select_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_insert_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_update_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "count_logs_delete_one" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin" ON public.session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin" ON public.session_count_logs;

-- 1) SELECT: 본인 또는 관리자만 조회
CREATE POLICY "count_logs_select_one" ON public.session_count_logs
  FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );

-- 2) INSERT: 관리자만 (teacher는 view만 가능)
CREATE POLICY "count_logs_insert_one" ON public.session_count_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );

-- 3) UPDATE: 관리자만 (액션당 정책 1개)
CREATE POLICY "count_logs_update_one" ON public.session_count_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );

-- 4) DELETE: 관리자만 (액션당 정책 1개)
CREATE POLICY "count_logs_delete_one" ON public.session_count_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );
