-- ========================================
-- 채팅 성능 최적화: unreadCounts 서버 집계 및 rooms denormalize
-- 실행 순서: 22번
-- ========================================

-- ===== 1단계: chat_participants 테이블에 컬럼 추가 =====
SELECT '📋 1단계: chat_participants 컬럼 추가...' as progress;

ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chat_participants
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 데이터의 joined_at을 created_at으로 설정 (만약 created_at이 있다면)
-- 없으면 현재 시간으로 설정
UPDATE chat_participants
SET joined_at = COALESCE(joined_at, NOW())
WHERE joined_at IS NULL;

SELECT '✅ chat_participants 컬럼 추가 완료' as status;

-- ===== 2단계: 인덱스 추가 =====
SELECT '📋 2단계: 인덱스 추가...' as progress;

-- 메시지 조회 성능
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
ON chat_messages(room_id, created_at DESC);

-- 참여자 조회 성능
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_room 
ON chat_participants(user_id, room_id);

-- last_read_at 인덱스 (unread 계산용)
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_read 
ON chat_participants(room_id, last_read_at);

SELECT '✅ 인덱스 추가 완료' as status;

-- ===== 3단계: RPC 함수 생성 (unreadCounts 서버 집계) =====
SELECT '📋 3단계: RPC 함수 생성...' as progress;

CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID)
RETURNS TABLE(room_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.room_id,
    COUNT(cm.id)::BIGINT as unread_count
  FROM chat_participants cp
  LEFT JOIN chat_messages cm 
    ON cm.room_id = cp.room_id
    AND cm.created_at > COALESCE(cp.last_read_at, cp.joined_at)
    AND cm.sender_id != p_user_id
  WHERE cp.user_id = p_user_id
  GROUP BY cp.room_id;
END;
$$;

-- RPC 함수 권한 부여
GRANT EXECUTE ON FUNCTION get_unread_counts(UUID) TO authenticated;

SELECT '✅ RPC 함수 생성 완료' as status;

-- ===== 4단계: chat_rooms에 denormalize 컬럼 추가 =====
SELECT '📋 4단계: chat_rooms denormalize 컬럼 추가...' as progress;

ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS last_message_content TEXT;

ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS last_message_sender_id UUID;

SELECT '✅ chat_rooms 컬럼 추가 완료' as status;

-- ===== 5단계: 트리거 생성 (메시지 insert 시 자동 갱신) =====
SELECT '📋 5단계: 트리거 생성...' as progress;

CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_rooms
  SET 
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS trigger_update_room_last_message ON chat_messages;

-- 트리거 생성
CREATE TRIGGER trigger_update_room_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_room_last_message();

SELECT '✅ 트리거 생성 완료' as status;

-- ===== 6단계: 기존 데이터 마이그레이션 =====
SELECT '📋 6단계: 기존 데이터 마이그레이션...' as progress;

-- 기존 방들의 마지막 메시지 정보 채우기
UPDATE chat_rooms cr
SET 
  last_message_at = sub.last_at,
  last_message_content = sub.last_content,
  last_message_sender_id = sub.last_sender
FROM (
  SELECT 
    room_id,
    MAX(created_at) as last_at,
    (array_agg(content ORDER BY created_at DESC))[1] as last_content,
    (array_agg(sender_id ORDER BY created_at DESC))[1] as last_sender
  FROM chat_messages
  GROUP BY room_id
) sub
WHERE cr.id = sub.room_id;

-- 메시지가 없는 방은 created_at을 last_message_at으로 설정
UPDATE chat_rooms
SET 
  last_message_at = created_at,
  last_message_content = '대화를 시작해보세요'
WHERE last_message_at IS NULL;

SELECT '✅ 데이터 마이그레이션 완료' as status;

-- ===== 7단계: 검증 =====
SELECT '📋 7단계: 검증...' as progress;

-- RPC 함수 테스트 (실제 user_id로 테스트 필요)
-- SELECT * FROM get_unread_counts('실제-user-id-여기');

-- 트리거 테스트 확인
SELECT 
  '트리거 확인' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_room_last_message';

-- 인덱스 확인
SELECT 
  '인덱스 확인' as check_type,
  indexname,
  tablename
FROM pg_indexes
WHERE indexname IN (
  'idx_chat_messages_room_created',
  'idx_chat_participants_user_room',
  'idx_chat_participants_room_read'
);

-- 컬럼 확인
SELECT 
  '컬럼 확인' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('chat_participants', 'chat_rooms')
  AND column_name IN ('last_read_at', 'joined_at', 'last_message_at', 'last_message_content', 'last_message_sender_id')
ORDER BY table_name, column_name;

SELECT '✅ 검증 완료' as status;
SELECT '🎉 모든 작업 완료!' as final_status;
