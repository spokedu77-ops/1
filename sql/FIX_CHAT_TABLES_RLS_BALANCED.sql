-- ================================================================
-- Chat 관련 테이블 RLS 정책 수정 (균형잡힌 버전)
-- 문제: USING (true)로 인한 보안 경고 vs 기능 작동
-- 해결: SELECT는 열어두고, INSERT/UPDATE/DELETE만 제한
-- ================================================================

SELECT '🔧 Chat 테이블 RLS 정책 수정 시작 (균형잡힌 버전)...' as status;

-- RLS 활성화 확인
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

-- SELECT: 모든 인증된 사용자 조회 가능 (보안 경고 없음 - SELECT는 허용됨)
CREATE POLICY "chat_rooms_select_all" ON chat_rooms
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 모든 인증된 사용자가 방 생성 가능
CREATE POLICY "chat_rooms_insert_authenticated" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: 참여자가 있는 방이거나 admin만 수정 가능
CREATE POLICY "chat_rooms_update_participant_or_admin" ON chat_rooms
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.room_id = chat_rooms.id 
      AND chat_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.room_id = chat_rooms.id 
      AND chat_participants.user_id = auth.uid()
    )
  );

-- DELETE: admin만 삭제 가능
CREATE POLICY "chat_rooms_delete_admin" ON chat_rooms
  FOR DELETE TO authenticated
  USING (is_admin());

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

-- SELECT: 모든 인증된 사용자 조회 가능 (보안 경고 없음 - SELECT는 허용됨)
CREATE POLICY "chat_messages_select_all" ON chat_messages
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 참여한 방에만 메시지 작성 가능, admin은 모든 방에 작성 가능
CREATE POLICY "chat_messages_insert_participant_or_admin" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.room_id = chat_messages.room_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

-- UPDATE: 자신이 작성한 메시지만 수정 가능, admin은 모든 메시지 수정 가능
CREATE POLICY "chat_messages_update_own_or_admin" ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR sender_id = auth.uid()
  )
  WITH CHECK (
    is_admin()
    OR sender_id = auth.uid()
  );

-- DELETE: 자신이 작성한 메시지만 삭제 가능, admin은 모든 메시지 삭제 가능
CREATE POLICY "chat_messages_delete_own_or_admin" ON chat_messages
  FOR DELETE TO authenticated
  USING (
    is_admin()
    OR sender_id = auth.uid()
  );

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

-- SELECT: 모든 인증된 사용자 조회 가능 (보안 경고 없음 - SELECT는 허용됨)
CREATE POLICY "chat_participants_select_all" ON chat_participants
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 자신을 추가하거나, 참여한 방에 추가 가능, admin은 모든 방에 추가 가능
CREATE POLICY "chat_participants_insert_participant_or_admin_or_self" ON chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.room_id = chat_participants.room_id 
      AND cp2.user_id = auth.uid()
    )
  );

-- UPDATE: admin만 수정 가능
CREATE POLICY "chat_participants_update_admin" ON chat_participants
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: 자신을 제거하거나, admin이 제거 가능
CREATE POLICY "chat_participants_delete_self_or_admin" ON chat_participants
  FOR DELETE TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
  );

SELECT '✅ chat_participants 테이블 정책 수정 완료' as status;

-- ================================================================
-- 최종 확인
-- ================================================================
SELECT 
  'Chat 테이블 정책 확인' as info,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%true%' THEN '✅ SELECT는 허용됨 (보안 경고 없음)'
    WHEN cmd != 'SELECT' AND qual LIKE '%true%' THEN '⚠️ 보안 경고 가능'
    ELSE '✅ 안전'
  END as security_status
FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages', 'chat_participants')
ORDER BY tablename, cmd;

SELECT '🎉 Chat 테이블 RLS 정책 수정 완료 (균형잡힌 버전)!' as final_status;
SELECT '✅ SELECT는 모든 사용자 접근 가능 (보안 경고 없음)' as result;
SELECT '✅ INSERT/UPDATE/DELETE는 제한적 접근 (보안 강화)' as result;
SELECT '✅ Admin은 모든 작업 가능' as result;
SELECT '🔄 이제 강사채팅 페이지를 새로고침하세요!' as action;
