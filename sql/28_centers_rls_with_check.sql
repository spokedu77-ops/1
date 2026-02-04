-- ================================================================
-- centers 관련 RLS 정책에 WITH CHECK 명시
-- INSERT 시 새 행 검증 조건을 명시해 정책 의도 명확화
-- 실행 순서: 28 (27_centers_schema.sql 적용 후)
-- ================================================================

-- centers
DROP POLICY IF EXISTS "authenticated_all_centers" ON centers;
CREATE POLICY "authenticated_all_centers" ON centers
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- center_finance_terms
DROP POLICY IF EXISTS "authenticated_all_center_finance_terms" ON center_finance_terms;
CREATE POLICY "authenticated_all_center_finance_terms" ON center_finance_terms
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- programs
DROP POLICY IF EXISTS "authenticated_all_programs" ON programs;
CREATE POLICY "authenticated_all_programs" ON programs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- center_logs
DROP POLICY IF EXISTS "authenticated_all_center_logs" ON center_logs;
CREATE POLICY "authenticated_all_center_logs" ON center_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- center_files
DROP POLICY IF EXISTS "authenticated_all_center_files" ON center_files;
CREATE POLICY "authenticated_all_center_files" ON center_files
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================================
SELECT 'Centers RLS WITH CHECK (28) applied.' AS status;
