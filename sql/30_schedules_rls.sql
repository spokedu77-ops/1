-- ================================================================
-- schedules RLS 정책 (authenticated 사용자 CRUD)
-- 실행 순서: 30 (29_schedules_schema.sql 적용 후)
-- ================================================================

DROP POLICY IF EXISTS "authenticated_all_schedules" ON schedules;
CREATE POLICY "authenticated_all_schedules" ON schedules
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================================
SELECT 'Schedules RLS (30) applied.' AS status;
