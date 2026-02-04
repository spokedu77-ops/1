-- ================================================================
-- Chat 관련 테이블 RLS 정책 수정
-- 문제: 강사채팅이 안 보임, 방 생성 실패
-- 해결: chat_rooms, chat_messages, chat_participants 테이블 정책 수정
-- ================================================================

SELECT '🔧 Chat 테이블 RLS 정책 수정 시작...' as status;

-- RLS 활성화 확인 및 활성화
ALTER TABLE IF EXISTS chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_participants ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- chat_rooms 테이블 정책 수정
-- ================================================================
-- 모든 기존 정책 삭제
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_rooms'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_rooms';
  END LOOP;
END $$;

-- 새 정책 생성 (모든 인증된 사용자 접근 가능)
CREATE POLICY "chat_rooms_all" ON chat_rooms
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '✅ chat_rooms 테이블 정책 수정 완료' as status;

-- ================================================================
-- chat_messages 테이블 정책 수정
-- ================================================================
-- 모든 기존 정책 삭제
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_messages'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_messages';
  END LOOP;
END $$;

-- 새 정책 생성 (모든 인증된 사용자 접근 가능)
CREATE POLICY "chat_messages_all" ON chat_messages
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '✅ chat_messages 테이블 정책 수정 완료' as status;

-- ================================================================
-- chat_participants 테이블 정책 수정
-- ================================================================
-- 모든 기존 정책 삭제
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_participants'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_participants';
  END LOOP;
END $$;

-- 새 정책 생성 (모든 인증된 사용자 접근 가능)
CREATE POLICY "chat_participants_all" ON chat_participants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '✅ chat_participants 테이블 정책 수정 완료' as status;

-- ================================================================
-- 최종 확인
-- ================================================================
SELECT 
  'Chat 테이블 정책 확인' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY tablename, cmd;

SELECT '🎉 Chat 테이블 RLS 정책 수정 완료!' as final_status;
SELECT '✅ 모든 인증된 사용자가 chat 테이블 접근 가능' as result;
SELECT '🔄 이제 강사채팅 페이지를 새로고침하세요!' as action;
