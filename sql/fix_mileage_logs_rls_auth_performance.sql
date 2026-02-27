-- =====================================================
-- mileage_logs RLS: auth.uid() 1회 평가로 성능 개선
-- =====================================================
-- 이슈: auth.uid()가 행마다 재평가되어 쿼리 성능 저하
-- 해결: auth.uid() → (SELECT auth.uid()) 로 치환
--
-- 현재 정책 확인:
--   SELECT polname, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as with_check
--   FROM pg_policy WHERE polrelid = 'public.mileage_logs'::regclass;
-- =====================================================

-- mileage_select_one (SELECT)
DROP POLICY IF EXISTS "mileage_select_one" ON public.mileage_logs;
CREATE POLICY "mileage_select_one" ON public.mileage_logs
  FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true OR u.name IN ('최지훈', '김윤기', '김구민'))
    )
  );
