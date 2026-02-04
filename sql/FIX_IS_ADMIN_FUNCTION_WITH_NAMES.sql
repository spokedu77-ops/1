-- ================================================================
-- is_admin() 함수 수정 - Admin 계정 3개 name도 확인
-- 문제: is_admin() 함수가 admin 계정 3개를 인식하지 못함
-- 해결: role, is_admin boolean, name 모두 확인하도록 수정
-- ================================================================

SELECT '🔧 is_admin() 함수 수정 시작...' as status;

-- is_admin() 함수 완전 재작성
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- users 테이블에서 다음 중 하나라도 만족하면 admin:
  -- 1. is_admin = true (boolean 컬럼)
  -- 2. role IN ('admin', 'ADMIN', 'master', 'MASTER')
  -- 3. name IN ('최지훈', '김구민', '김윤기')
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      is_admin = true
      OR role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR name IN ('최지훈', '김구민', '김윤기')
    )
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'ADMIN', 'master', 'MASTER')
  );
END;
$$;

SELECT '✅ is_admin() 함수 수정 완료' as status;

-- 확인 쿼리
SELECT 
  'is_admin() 함수 테스트' as test_name,
  is_admin() as is_admin_result,
  auth.uid() as current_user_id,
  CASE 
    WHEN is_admin() THEN '✅ Admin 권한 확인됨 - 모든 데이터 접근 가능'
    ELSE '❌ Admin 권한 없음'
  END as admin_status;

-- Admin 계정 3개 확인
SELECT 
  'Admin Accounts Check' as info,
  name,
  email,
  role,
  is_admin,
  CASE 
    WHEN is_admin = true THEN '✅ is_admin = true'
    WHEN role IN ('admin', 'ADMIN', 'master', 'MASTER') THEN '✅ role OK'
    WHEN name IN ('최지훈', '김구민', '김윤기') THEN '✅ name OK'
    ELSE '❌ No admin indicator'
  END as admin_status
FROM users
WHERE name IN ('최지훈', '김구민', '김윤기')
ORDER BY name;
