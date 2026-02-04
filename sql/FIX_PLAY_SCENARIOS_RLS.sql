-- ================================================================
-- RLS 정책 수정: WITH CHECK 절 추가 (INSERT 허용)
-- 문제: 기존 정책에 WITH CHECK가 없어서 INSERT 차단
-- ================================================================

-- is_admin() 함수: 소문자 'admin', 'master'도 인식
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'ADMIN' OR users.role = 'admin' OR users.role = 'master')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- play_scenarios: WITH CHECK 추가
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
CREATE POLICY "Admin full access to play scenarios" ON play_scenarios
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- warmup_programs_composite: WITH CHECK 추가
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
CREATE POLICY "Admin full access to composite programs" ON warmup_programs_composite
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- rotation_schedule: WITH CHECK 추가
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
CREATE POLICY "Admin full access to rotation schedule" ON rotation_schedule
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

SELECT '✅ RLS 정책 수정 완료' as status;
