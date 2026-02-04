-- ==========================================
-- Storage 정책 확인 및 디버깅
-- ==========================================

-- 1. is_admin() 함수 확인
SELECT 
  'is_admin() 함수 테스트' as test_name,
  is_admin() as is_admin_result,
  auth.uid() as current_user_id;

-- 2. 현재 사용자의 role 확인
SELECT 
  '현재 사용자 role 확인' as test_name,
  id,
  name,
  role,
  UPPER(role) as role_upper,
  CASE 
    WHEN UPPER(role) = 'ADMIN' THEN 'ADMIN 매치'
    WHEN role = 'admin' THEN 'admin 매치'
    WHEN role = 'master' THEN 'master 매치'
    ELSE '매치 없음'
  END as role_match_status
FROM users
WHERE id = auth.uid();

-- 3. Storage 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%iiwarmup%' OR policyname LIKE '%Admin%';

-- 4. Storage 버킷 확인
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'iiwarmup-files';

-- 5. is_admin() 함수 정의 확인
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'is_admin'
  AND n.nspname = 'public';
