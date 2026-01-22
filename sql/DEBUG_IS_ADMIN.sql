-- ========================================
-- is_admin() 함수 디버깅
-- ========================================

-- 1. 직접 쿼리로 확인 (함수 없이)
SELECT 
  'Direct Query Test' as test,
  auth.uid() as current_uid,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master')
  ) as should_be_admin;

-- 2. is_admin() 함수 호출
SELECT 
  'Function Test' as test,
  is_admin() as function_result;

-- 3. 실제 매칭 확인
SELECT 
  'Matching Test' as test,
  u.id as user_id_in_table,
  auth.uid() as current_auth_uid,
  u.id = auth.uid() as ids_match,
  u.role as role_value,
  u.role IN ('admin', 'master') as role_matches
FROM users u
WHERE u.id = auth.uid();

-- 4. 강제로 users 테이블의 role 값 확인
SELECT 
  'Role Value Check' as test,
  id,
  email,
  role,
  LENGTH(role) as role_length,
  role = 'admin' as exact_match_admin,
  LOWER(role) = 'admin' as lower_match_admin
FROM users
WHERE email = 'choijihoon@spokedu.com';
