-- =====================================================
-- update_session_with_mileage 함수 확인 및 수정
-- =====================================================

-- STEP 1: 기존 함수 확인
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'update_session_with_mileage';

-- STEP 2: 함수가 없으면 아래 주석 해제 (함수가 필요한지 확인)
/*
-- 함수가 실제로 존재하지 않는다면 DROP만 실행
DROP FUNCTION IF EXISTS update_session_with_mileage();
*/

-- STEP 3: 함수가 있고 로직을 알면 아래와 같이 수정
-- (실제 로직을 위의 SELECT 결과에서 복사해서 SET search_path만 추가)
/*
CREATE OR REPLACE FUNCTION update_session_with_mileage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 이 줄 추가
AS $$
BEGIN
  -- 여기에 기존 로직 복사
  RETURN NEW;
END;
$$;
*/
