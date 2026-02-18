-- ================================================================
-- "동기화했는데 선생님 앱에서 수업/정산이 안 보일 때" 원인 확인
-- 
-- 사용법: 아래에서 'leejinpyo@spokedu.com' 을 해당 선생님 이메일로 바꾼 뒤
--         Supabase SQL Editor에서 실행 (Service Role 권장)
-- ================================================================

-- 1) auth id / public id 일치 여부
SELECT
  '1. auth vs public 일치' AS check_name,
  au.id AS auth_id,
  pu.id AS public_id,
  (au.id = pu.id) AS ids_match
FROM auth.users au
LEFT JOIN public.users pu ON LOWER(TRIM(pu.email)) = LOWER(TRIM(au.email))
WHERE LOWER(TRIM(au.email)) = LOWER(TRIM('leejinpyo@spokedu.com'));  -- 이메일 수정

-- 2) 해당 선생님(auth id)으로 sessions 건수 (상태별)
SELECT
  '2. 수업(sessions) 건수' AS check_name,
  s.status,
  COUNT(*) AS cnt
FROM sessions s
INNER JOIN auth.users au ON au.id = s.created_by
WHERE LOWER(TRIM(au.email)) = LOWER(TRIM('leejinpyo@spokedu.com'))  -- 이메일 수정
GROUP BY s.status
ORDER BY s.status;

-- 3) 정산 화면에 나오는 건수 (status IN ('finished','verified')만)
SELECT
  '3. 정산 노출 대상 수업' AS check_name,
  COUNT(*) AS cnt
FROM sessions s
INNER JOIN auth.users au ON au.id = s.created_by
WHERE LOWER(TRIM(au.email)) = LOWER(TRIM('leejinpyo@spokedu.com'))  -- 이메일 수정
  AND s.status IN ('finished', 'verified');

-- 4) public.users에 해당 auth id로 행이 있는지 (선생님 앱에서 이름/포인트 조회용)
SELECT
  '4. public.users 행' AS check_name,
  u.id,
  u.email,
  u.name,
  u.role
FROM public.users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('leejinpyo@spokedu.com'));  -- 이메일 수정
