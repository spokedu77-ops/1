-- ========================================
-- 채팅방 참여자 데이터 복구 SQL
-- ========================================

-- 1. 참여자가 1명만 있는 방 찾기 (문제가 있는 방들)
SELECT 
  cr.id as room_id,
  cr.custom_name,
  cr.created_at,
  cp.user_id as existing_participant,
  u.name as existing_participant_name,
  u.role as existing_participant_role
FROM chat_rooms cr
LEFT JOIN chat_participants cp ON cr.id = cp.room_id
LEFT JOIN users u ON cp.user_id = u.id
WHERE cr.id IN (
  SELECT room_id 
  FROM chat_participants 
  GROUP BY room_id 
  HAVING COUNT(*) = 1
)
ORDER BY cr.created_at DESC;

-- 2. 방 이름에서 선생님 이름 추출하여 누락된 선생님 찾기
-- 예: "정재원 선생님" → users 테이블에서 name = "정재원" AND role = "teacher" 찾기
-- 실제 복구는 수동으로 진행하거나 아래 쿼리를 참고하여 INSERT 실행

-- 예시: 특정 방에 선생님 추가 (수동으로 room_id와 teacher_id 확인 후 실행)
/*
INSERT INTO chat_participants (room_id, user_id)
VALUES 
  ('방_ID_여기', '선생님_ID_여기');
*/

-- 3. 복구 후 확인: 모든 방의 참여자 수 확인
SELECT 
  cr.id as room_id,
  cr.custom_name,
  COUNT(cp.user_id) as participant_count,
  STRING_AGG(u.name || ' (' || u.role || ')', ', ') as participants
FROM chat_rooms cr
LEFT JOIN chat_participants cp ON cr.id = cp.room_id
LEFT JOIN users u ON cp.user_id = u.id
GROUP BY cr.id, cr.custom_name
ORDER BY participant_count ASC, cr.created_at DESC;
