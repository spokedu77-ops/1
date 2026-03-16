-- ==========================================
-- session_count_logs: 세션당 1건 → (세션, 강사)당 1건으로 변경
-- 주강사 + 보조강사 모두 수업 카운팅에 포함되도록
-- ==========================================
-- 실행 전: 기존 session_id 유니크만 제거하고, (session_id, teacher_id) 유니크로 대체
-- ==========================================

-- 1. 기존 session_id 단일 유니크 제거
DROP INDEX IF EXISTS session_count_logs_session_id_key;

-- 2. (session_id, teacher_id) 복합 유니크 추가: 같은 세션에 같은 강사는 1건만, 다른 강사는 각각 1건 허용
CREATE UNIQUE INDEX IF NOT EXISTS session_count_logs_session_teacher_key
  ON session_count_logs (session_id, teacher_id)
  WHERE session_id IS NOT NULL;

-- 완료. 이제 한 세션에 주강사·보조강사 각각 1건씩 로그 가능.
