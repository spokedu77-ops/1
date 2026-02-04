-- ================================================================
-- Admin Role 진단 쿼리
-- 현재 사용자의 role이 어디에 저장되어 있는지 확인
-- ================================================================

-- 1. 현재 인증된 사용자 정보
SELECT 
  'Current Auth User' as info,
  auth.uid() as user_id,
  auth.email() as email;

-- 2. users 테이블에서 현재 사용자 확인
SELECT 
  'Users Table' as source,
  id,
  email,
  role as users_role,
  name,
  is_admin,
  created_at
FROM users
WHERE id = auth.uid();

-- 3. profiles 테이블에서 현재 사용자 확인
SELECT 
  'Profiles Table' as source,
  id,
  email,
  role as profiles_role
FROM profiles
WHERE id = auth.uid();

-- 4. is_admin() 함수 결과
SELECT 
  'is_admin() Function' as info,
  is_admin() as result;

-- 5. 직접 role 확인 (users 테이블)
SELECT 
  'Direct Check (users)' as check_type,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'ADMIN' OR role = 'master' OR role = 'MASTER')
  ) as is_admin_from_users;

-- 6. 직접 role 확인 (profiles 테이블)
SELECT 
  'Direct Check (profiles)' as check_type,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'ADMIN' OR role = 'master' OR role = 'MASTER')
  ) as is_admin_from_profiles;

-- 7. 두 테이블 모두 확인
SELECT 
  'Combined Check' as check_type,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'ADMIN' OR role = 'master' OR role = 'MASTER')
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'ADMIN' OR role = 'master' OR role = 'MASTER')
  ) as is_admin_combined;
