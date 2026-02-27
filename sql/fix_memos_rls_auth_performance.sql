-- =====================================================
-- memos, dashboard_memos RLS: auth.uid() 1회 평가로 성능 개선
-- =====================================================
-- 이슈: auth.uid()가 행마다 재평가됨
-- 해결: auth.uid() → (SELECT auth.uid()) 로 치환
-- =====================================================

-- ===== memos =====
DROP POLICY IF EXISTS "memos_admin_only" ON public.memos;
DROP POLICY IF EXISTS "Allow admin read access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin update access" ON public.memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON public.memos;

CREATE POLICY "memos_admin_only" ON public.memos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );

-- ===== dashboard_memos =====
DROP POLICY IF EXISTS "dashboard_memos_admin_only" ON public.dashboard_memos;
DROP POLICY IF EXISTS "dashboard_memos_all" ON public.dashboard_memos;

CREATE POLICY "dashboard_memos_admin_only" ON public.dashboard_memos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );
