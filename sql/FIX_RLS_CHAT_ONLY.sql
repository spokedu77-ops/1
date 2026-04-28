-- ================================================================
-- Chat 전용 RLS: 테이블당 정책 1개 (Multiple Permissive 제거)
-- lesson_plans / 기타 테이블은 건드리지 않음. 채팅 RLS만 수정할 때 이 스크립트만 실행.
-- ================================================================

SELECT '🔧 Chat RLS 전용 수정...' as status;

-- rls_is_admin() 없으면 정책에서 사용 불가하므로 정의 (이미 있으면 교체)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.rls_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.is_admin = true
      OR u.role IN ('admin', 'ADMIN', 'master', 'MASTER')
      OR u.name IN ('최지훈', '김구민', '김윤기')
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'ADMIN', 'master', 'MASTER')
  );
$$;

-- 기존 정책 전부 제거 (이름 무관하게 pg_policies 기준으로 삭제)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_rooms'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_rooms';
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_messages';
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_participants'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_participants';
  END LOOP;
END $$;

-- 테이블당 정책 1개: admin만 접근 (auth 1회 평가)
CREATE POLICY "chat_rooms_one" ON chat_rooms
  FOR ALL TO authenticated
  USING ((SELECT private.rls_is_admin())) WITH CHECK ((SELECT private.rls_is_admin()));

CREATE POLICY "chat_messages_one" ON chat_messages
  FOR ALL TO authenticated
  USING ((SELECT private.rls_is_admin())) WITH CHECK ((SELECT private.rls_is_admin()));

CREATE POLICY "chat_participants_one" ON chat_participants
  FOR ALL TO authenticated
  USING ((SELECT private.rls_is_admin())) WITH CHECK ((SELECT private.rls_is_admin()));

SELECT '✅ Chat 정책 적용 (테이블당 1개, rls_is_admin)' as status;
