-- ================================================================
-- 실제 Role 값 확인 (대소문자, 공백, null 등 모든 경우 확인)
-- ================================================================

-- 1. users 테이블의 모든 컬럼과 role 값 확인
SELECT 
  'Users Table - All Columns' as info,
  id,
  email,
  role,
  name,
  is_admin,
  -- role 값 상세 분석
  role::text as role_text,
  LENGTH(role::text) as role_length,
  role = 'admin' as exact_lowercase_admin,
  role = 'ADMIN' as exact_uppercase_admin,
  LOWER(TRIM(role::text)) = 'admin' as normalized_admin,
  role::text IN ('admin', 'ADMIN', 'master', 'MASTER') as in_admin_list
FROM users
WHERE id = auth.uid();

-- 2. profiles 테이블의 모든 컬럼과 role 값 확인
SELECT 
  'Profiles Table - All Columns' as info,
  id,
  email,
  role,
  -- role 값 상세 분석
  role::text as role_text,
  LENGTH(role::text) as role_length,
  role = 'admin' as exact_lowercase_admin,
  role = 'ADMIN' as exact_uppercase_admin,
  LOWER(TRIM(role::text)) = 'admin' as normalized_admin,
  role::text IN ('admin', 'ADMIN', 'master', 'MASTER') as in_admin_list
FROM profiles
WHERE id = auth.uid();

-- 3. users 테이블의 role 컬럼 타입 확인
SELECT 
  'Users Table Schema' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'role';

-- 4. profiles 테이블의 role 컬럼 타입 확인
SELECT 
  'Profiles Table Schema' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'role';

-- 5. users 테이블의 모든 role 값 샘플 (다른 사용자들)
SELECT 
  'Sample Roles from Users' as info,
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;

-- 6. profiles 테이블의 모든 role 값 샘플 (다른 사용자들)
SELECT 
  'Sample Roles from Profiles' as info,
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;
