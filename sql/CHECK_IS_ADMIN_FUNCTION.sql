-- ========================================
-- is_admin() 함수 확인 및 우회 방법
-- ========================================

-- 1. is_admin() 함수 정의 확인
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'is_admin'
AND routine_schema = 'public';

-- 2. 모든 함수 목록 (is_admin 관련)
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%admin%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
