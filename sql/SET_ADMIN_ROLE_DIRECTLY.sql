-- ================================================================
-- 현재 사용자를 Admin으로 직접 설정
-- 이 SQL은 현재 로그인한 사용자의 role을 admin으로 설정합니다
-- ================================================================

-- 1. 현재 사용자 확인
SELECT 
  'Current User' as info,
  auth.uid() as user_id,
  auth.email() as email;

-- 2. users 테이블에 role 설정 (없으면 INSERT, 있으면 UPDATE)
INSERT INTO users (id, email, role, name, is_admin)
SELECT 
  auth.uid(),
  auth.email(),
  'admin',
  COALESCE((SELECT name FROM users WHERE id = auth.uid()), 'Admin User'),
  true
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  is_admin = true,
  updated_at = NOW();

-- 3. profiles 테이블에도 role 설정 (profiles 테이블이 있는 경우)
-- profiles 테이블이 없으면 에러가 나지만 무시해도 됩니다
DO $$
BEGIN
  -- profiles 테이블이 존재하는지 확인
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- profiles 테이블에 레코드가 있으면 UPDATE, 없으면 INSERT
    INSERT INTO profiles (id, email, role)
    SELECT 
      auth.uid(),
      auth.email(),
      'admin'
    WHERE auth.uid() IS NOT NULL
    ON CONFLICT (id) 
    DO UPDATE SET 
      role = 'admin';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- profiles 테이블이 없거나 에러가 나도 계속 진행
    RAISE NOTICE 'Profiles table update skipped: %', SQLERRM;
END $$;

-- 4. 설정 결과 확인
SELECT 
  'Users Table Result' as source,
  id,
  email,
  role,
  is_admin,
  name
FROM users
WHERE id = auth.uid();

-- profiles 테이블 확인 (있는 경우)
SELECT 
  'Profiles Table Result' as source,
  id,
  email,
  role
FROM profiles
WHERE id = auth.uid();

-- 5. is_admin() 함수 테스트
SELECT 
  'is_admin() Test' as info,
  is_admin() as result,
  CASE 
    WHEN is_admin() THEN '✅ Admin 권한 설정 완료!'
    ELSE '❌ 여전히 권한 없음 - 추가 확인 필요'
  END as status;
