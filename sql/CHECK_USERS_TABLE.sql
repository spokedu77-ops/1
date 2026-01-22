-- ========================================
-- Users 테이블 상태 확인
-- ========================================

-- 1. users 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. 현재 사용자 확인 (auth)
SELECT 
  'Current Auth User' as info,
  auth.uid() as user_id,
  auth.email() as email;

-- 3. users 테이블에서 현재 사용자 찾기
SELECT 
  'User in users table' as info,
  id,
  email,
  role,
  name,
  created_at
FROM users
WHERE id = 'd86773c0-ff7f-4ade-9ef8-340f1a9bb4b0'::uuid;

-- 4. users 테이블 전체 확인 (처음 5개)
SELECT 
  'All users (first 5)' as info,
  id,
  email,
  role,
  name
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- 5. users 테이블 RLS 정책 확인
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
WHERE tablename = 'users';
