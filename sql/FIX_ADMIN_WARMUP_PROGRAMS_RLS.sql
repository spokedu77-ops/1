-- ================================================================
-- Admin이 모든 warmup_programs_composite 데이터를 볼 수 있도록 RLS 정책 수정
-- 문제: admin 계정으로 로그인해도 자기 아이디에만 해당하는 것만 보임
-- 해결: admin 정책이 모든 데이터에 접근할 수 있도록 명시적으로 설정
-- ================================================================

-- 1. is_admin() 함수 확인 및 수정 (is_admin boolean 컬럼과 role 모두 확인)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- users 테이블에서 is_admin boolean 컬럼 또는 admin/master role 확인
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      is_admin = true 
      OR role = 'admin' 
      OR role = 'ADMIN' 
      OR role = 'master' 
      OR role = 'MASTER'
    )
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'ADMIN' OR role = 'master' OR role = 'MASTER')
  );
END;
$$;

-- 2. warmup_programs_composite 테이블의 기존 정책 삭제
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "All users can read active composite programs" ON warmup_programs_composite;

-- 3. Admin 정책 재생성 (모든 데이터 접근 가능, is_active 조건 없음)
CREATE POLICY "Admin full access to composite programs"
ON warmup_programs_composite
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 4. 일반 사용자 정책 (활성화된 프로그램만 읽기)
CREATE POLICY "All users can read active composite programs"
ON warmup_programs_composite
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 5. rotation_schedule 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;

CREATE POLICY "Admin full access to rotation schedule"
ON rotation_schedule
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All users can read published schedules"
ON rotation_schedule
FOR SELECT
USING (is_published = true AND auth.uid() IS NOT NULL);

-- 6. play_scenarios 테이블도 확인 및 수정
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;

CREATE POLICY "Admin full access to play scenarios"
ON play_scenarios
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All users can read play scenarios"
ON play_scenarios
FOR SELECT
USING (true);

-- 7. 확인 쿼리
SELECT 
  'RLS 정책 수정 완료' as status,
  is_admin() as is_admin_result,
  auth.uid() as current_user_id,
  CASE 
    WHEN is_admin() THEN '✅ Admin 권한 확인됨 - 모든 데이터 접근 가능'
    ELSE '❌ Admin 권한 없음'
  END as admin_status;

-- 8. 테스트 쿼리 (admin으로 로그인한 상태에서 실행)
-- SELECT COUNT(*) as total_programs FROM warmup_programs_composite;
-- SELECT COUNT(*) as active_programs FROM warmup_programs_composite WHERE is_active = true;
-- SELECT COUNT(*) as inactive_programs FROM warmup_programs_composite WHERE is_active = false;
