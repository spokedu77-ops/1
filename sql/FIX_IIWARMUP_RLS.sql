-- ========================================
-- I.I.Warm-up RLS 문제 해결 (ADMIN 권한 설정)
-- ========================================
-- 실행 방법: Supabase SQL Editor에서 전체 선택 후 Run

-- 1단계: 현재 상태 확인
DO $$ 
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  user_exists BOOLEAN;
  user_role TEXT;
BEGIN
  -- 현재 사용자 정보 가져오기
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  RAISE NOTICE '======================================';
  RAISE NOTICE '현재 로그인 사용자:';
  RAISE NOTICE '  ID: %', current_user_id;
  RAISE NOTICE '  Email: %', current_user_email;
  RAISE NOTICE '======================================';
  
  -- users 테이블에 사용자 존재 여부 확인
  SELECT EXISTS(SELECT 1 FROM users WHERE id = current_user_id) INTO user_exists;
  
  IF user_exists THEN
    SELECT role INTO user_role FROM users WHERE id = current_user_id;
    RAISE NOTICE 'users 테이블 상태: 존재함';
    RAISE NOTICE '  현재 Role: %', user_role;
  ELSE
    RAISE NOTICE 'users 테이블 상태: 존재하지 않음';
  END IF;
  RAISE NOTICE '======================================';
END $$;

-- 2단계: 현재 사용자를 ADMIN으로 등록/업데이트
-- users 테이블에 없으면 INSERT, 있으면 role을 ADMIN으로 UPDATE
INSERT INTO users (id, email, role, name)
SELECT 
  auth.uid(),
  auth.email(),
  'ADMIN',
  '최지훈'  -- 이름을 직접 지정
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'ADMIN',
  name = '최지훈',
  updated_at = NOW();

-- 3단계: 결과 확인
DO $$ 
DECLARE
  final_role TEXT;
  final_name TEXT;
BEGIN
  SELECT role, name INTO final_role, final_name 
  FROM users 
  WHERE id = auth.uid();
  
  RAISE NOTICE '======================================';
  RAISE NOTICE '최종 결과:';
  RAISE NOTICE '  이름: %', final_name;
  RAISE NOTICE '  Role: %', final_role;
  
  IF final_role = 'ADMIN' THEN
    RAISE NOTICE '  상태: ✅ ADMIN 권한 설정 완료!';
  ELSE
    RAISE NOTICE '  상태: ❌ ADMIN 권한 설정 실패';
  END IF;
  RAISE NOTICE '======================================';
END $$;

-- 4단계: RLS 정책 동작 테스트
SELECT 
  '정책 테스트' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    ) THEN '✅ RLS 정책이 통과될 것입니다'
    ELSE '❌ RLS 정책에서 차단될 것입니다'
  END as result;
