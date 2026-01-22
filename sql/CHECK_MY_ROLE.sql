-- 현재 내 users 레코드 정확히 확인
SELECT 
  id,
  email,
  role,              -- 이 값이 무엇인지 확인!
  is_admin,          -- boolean 컬럼
  name,
  created_at
FROM users
WHERE id = 'd86773c0-ff7f-4ade-9ef8-340f1a9bb4b0'::uuid;

-- is_admin() 함수 테스트
SELECT is_admin() as is_admin_result;
