-- ========================================
-- Service Role로 실행해야 함!
-- ========================================
-- 주의: 이 SQL은 Supabase Dashboard의 SQL Editor에서
-- "RLS 무시" 옵션을 켜고 실행해야 합니다!

-- 1. users 테이블 RLS 임시 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. 관리자 계정 추가
INSERT INTO users (id, email, role, name, is_admin)
VALUES (
  'd86773c0-ff7f-4ade-9ef8-340f1a9bb4b0'::uuid,
  'choijihoon@spokedu.com',
  'admin',
  '최지훈',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_admin = true,
  name = '최지훈';

-- 3. users 테이블 RLS 다시 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. 확인
SELECT 
  id,
  email,
  role,
  is_admin,
  name
FROM users
WHERE email = 'choijihoon@spokedu.com';
