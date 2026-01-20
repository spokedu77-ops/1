-- ========================================
-- 채팅방 참여자 FK 문제 해결 SQL
-- ========================================

-- 1. chat_participants 테이블의 FK 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_participants' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- 2. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'chat_participants';

-- 3. 필요시 FK 재설정 (auth.users → public.users)
-- 주의: 실행 전 1번 결과를 확인하고, auth.users를 참조하고 있을 경우만 실행하세요
/*
-- 현재 FK 삭제
ALTER TABLE chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;

-- public.users를 참조하도록 재생성
ALTER TABLE chat_participants
ADD CONSTRAINT chat_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
*/

-- 4. 참여자가 누락된 방 찾기
SELECT 
  cr.id as room_id,
  cr.custom_name,
  cr.created_at,
  COUNT(cp.user_id) as participant_count
FROM chat_rooms cr
LEFT JOIN chat_participants cp ON cr.id = cp.room_id
GROUP BY cr.id, cr.custom_name, cr.created_at
HAVING COUNT(cp.user_id) < 2
ORDER BY cr.created_at DESC;
