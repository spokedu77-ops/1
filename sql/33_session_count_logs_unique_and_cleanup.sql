-- ==========================================
-- session_count_logs: 중복 정리 + session_id UNIQUE
-- 기존 중복 제거 후 한 세션당 로그 1건만 허용
-- ==========================================

-- 1. 중복 정리: session_id가 같은 로그 중 created_at 기준 가장 오래된 1건만 남기고 삭제
DELETE FROM session_count_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) AS rn
    FROM session_count_logs
    WHERE session_id IS NOT NULL
  ) sub
  WHERE sub.rn > 1
);

-- 2. session_id 유니크 제약 추가 (NULL은 여러 건 허용)
ALTER TABLE session_count_logs
  DROP CONSTRAINT IF EXISTS session_count_logs_session_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS session_count_logs_session_id_key
  ON session_count_logs (session_id)
  WHERE session_id IS NOT NULL;

-- 완료. 이제 동일 session_id로 두 번째 INSERT 시 유니크 위반으로 중복 방지됨.
