-- ================================================================
-- Admin 계정 3개 구조 진단
-- 문제: is_admin() 함수가 admin 계정 3개를 인식하지 못함
-- 목적: users 테이블 구조와 admin 계정 데이터 확인
-- ================================================================

-- 1. users 테이블 전체 구조 확인
SELECT 
  'Users Table Structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Admin 계정 3개 찾기 (name으로)
SELECT 
  'Admin Accounts by Name' as info,
  id,
  email,
  name,
  role,
  is_admin,
  is_active,
  created_at,
  updated_at
FROM users
WHERE name IN ('최지훈', '김구민', '김윤기')
ORDER BY name;

-- 3. Admin 계정 찾기 (role로)
SELECT 
  'Admin Accounts by Role' as info,
  id,
  email,
  name,
  role,
  is_admin,
  is_active
FROM users
WHERE role IN ('admin', 'ADMIN', 'master', 'MASTER')
   OR is_admin = true
ORDER BY name;

-- 4. Admin 계정 찾기 (is_admin boolean으로)
SELECT 
  'Admin Accounts by is_admin' as info,
  id,
  email,
  name,
  role,
  is_admin,
  is_active
FROM users
WHERE is_admin = true
ORDER BY name;

-- 5. 현재 로그인한 사용자 정보
SELECT 
  'Current Auth User' as info,
  auth.uid() as user_id,
  auth.email() as email;

-- 6. 현재 사용자의 users 테이블 데이터
SELECT 
  'Current User in users Table' as info,
  id,
  email,
  name,
  role,
  is_admin,
  is_active,
  -- 상세 분석
  role::text as role_text,
  CASE 
    WHEN is_admin = true THEN 'is_admin = true'
    WHEN is_admin = false THEN 'is_admin = false'
    WHEN is_admin IS NULL THEN 'is_admin = NULL'
  END as is_admin_status,
  CASE 
    WHEN role = 'admin' THEN 'role = admin (lowercase)'
    WHEN role = 'ADMIN' THEN 'role = ADMIN (uppercase)'
    WHEN role = 'master' THEN 'role = master'
    WHEN role = 'MASTER' THEN 'role = MASTER'
    ELSE 'role = ' || COALESCE(role::text, 'NULL')
  END as role_status,
  name IN ('최지훈', '김구민', '김윤기') as is_admin_by_name
FROM users
WHERE id = auth.uid();

-- 7. is_admin() 함수 테스트
SELECT 
  'is_admin() Function Test' as info,
  is_admin() as function_result;

-- 8. 직접 쿼리로 admin 체크 (다양한 방법)
SELECT 
  'Direct Admin Check Tests' as info,
  -- 방법 1: role로 체크
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'ADMIN', 'master', 'MASTER')
  ) as check_by_role,
  -- 방법 2: is_admin boolean으로 체크
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_admin = true
  ) as check_by_is_admin,
  -- 방법 3: name으로 체크
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND name IN ('최지훈', '김구민', '김윤기')
  ) as check_by_name,
  -- 방법 4: role 또는 is_admin
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR is_admin = true
    )
  ) as check_by_role_or_is_admin,
  -- 방법 5: role 또는 is_admin 또는 name
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR is_admin = true
      OR name IN ('최지훈', '김구민', '김윤기')
    )
  ) as check_by_all_methods;

-- 9. 모든 users 데이터 샘플 (처음 10개)
SELECT 
  'Sample Users Data' as info,
  id,
  email,
  name,
  role,
  is_admin,
  is_active
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 10. Admin 계정들의 실제 값 비교
SELECT 
  'Admin Accounts Comparison' as info,
  name,
  email,
  role,
  is_admin,
  CASE 
    WHEN role IN ('admin', 'ADMIN', 'master', 'MASTER') THEN '✅ role OK'
    WHEN is_admin = true THEN '✅ is_admin OK'
    WHEN name IN ('최지훈', '김구민', '김윤기') THEN '✅ name OK'
    ELSE '❌ No admin indicator'
  END as admin_status
FROM users
WHERE name IN ('최지훈', '김구민', '김윤기')
   OR role IN ('admin', 'ADMIN', 'master', 'MASTER')
   OR is_admin = true
ORDER BY name;
