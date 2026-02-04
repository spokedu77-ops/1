-- ================================================================
-- Chat 테이블 진단
-- 문제: 채팅방이 안 나오고 방 생성도 실패
-- ================================================================

-- 1. Chat 테이블 존재 확인
SELECT 
  'Table Existence Check' as info,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 존재함'
    ELSE '❌ 없음'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY table_name;

-- 2. RLS 활성화 상태 확인
SELECT 
  'RLS Status Check' as info,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS 활성화'
    ELSE '❌ RLS 비활성화'
  END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND tablename IN ('chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY tablename;

-- 3. 현재 RLS 정책 확인
SELECT 
  'Current Policies' as info,
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY tablename, cmd;

-- 4. 현재 사용자 정보
SELECT 
  'Current User' as info,
  auth.uid() as user_id,
  auth.email() as email;

-- 5. 현재 사용자의 users 테이블 데이터
SELECT 
  'Current User Data' as info,
  id,
  email,
  name,
  role,
  is_admin
FROM users
WHERE id = auth.uid();

-- 6. chat_rooms 데이터 샘플 (RLS 정책 테스트)
SELECT 
  'chat_rooms Data Test' as info,
  COUNT(*) as total_rooms,
  COUNT(*) FILTER (WHERE true) as accessible_rooms
FROM chat_rooms;

-- 7. chat_participants 데이터 샘플
SELECT 
  'chat_participants Data Test' as info,
  COUNT(*) as total_participants
FROM chat_participants;

-- 8. chat_messages 데이터 샘플
SELECT 
  'chat_messages Data Test' as info,
  COUNT(*) as total_messages
FROM chat_messages;

-- 9. 직접 SELECT 테스트 (에러 메시지 확인)
DO $$
DECLARE
  room_count INTEGER;
  participant_count INTEGER;
  message_count INTEGER;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO room_count FROM chat_rooms;
    RAISE NOTICE '✅ chat_rooms 조회 성공: %개', room_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ chat_rooms 조회 실패: %', SQLERRM;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO participant_count FROM chat_participants;
    RAISE NOTICE '✅ chat_participants 조회 성공: %개', participant_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ chat_participants 조회 실패: %', SQLERRM;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO message_count FROM chat_messages;
    RAISE NOTICE '✅ chat_messages 조회 성공: %개', message_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ chat_messages 조회 실패: %', SQLERRM;
  END;
END $$;
