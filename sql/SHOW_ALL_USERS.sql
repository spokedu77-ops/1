-- users 테이블 전체 확인
SELECT 
  id,
  email,
  role,
  is_admin,
  name,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- 현재 로그인 사용자 정보
SELECT 
  'Current User' as info,
  auth.uid() as uid,
  auth.email() as email;
