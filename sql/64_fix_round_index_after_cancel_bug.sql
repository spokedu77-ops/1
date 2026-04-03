-- ============================================================
-- 취소 버그로 잘못 덮어써진 round_index / round_total 복구
-- 배경:
--   이전 handleDeleteSession 버그가 취소(cancel) 후 나머지 활성 세션을
--   1~N 으로 재정렬하고 round_total = N(활성 수) 으로 덮어씀.
--   취소된 세션은 건드리지 않아 round_total = 원래 값(8 등)이 남아있음.
--
-- 복구 대상 조건:
--   같은 group_id 내에
--     - 취소(cancelled) 세션의 round_total > 활성 세션의 round_total
--     → 취소 세션의 round_total 이 계약 총 회차이므로 이것으로 복구한다.
--     - 활성 세션의 round_index 는 "취소된 세션 수만큼 앞당겨" 진 상태
--       → round_index += (취소된 세션 수)  로 복구
-- ============================================================

-- 1. 복구 대상 group_id 및 올바른 총회차, 취소 세션 수 파악
WITH group_stats AS (
  SELECT
    group_id,
    MAX(CASE WHEN status = 'cancelled' THEN round_total END)      AS correct_total,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)               AS cancelled_count,
    MAX(CASE WHEN status NOT IN ('cancelled','deleted') THEN round_total END) AS active_total
  FROM sessions
  WHERE group_id IS NOT NULL
    AND status != 'deleted'
    AND round_total IS NOT NULL
  GROUP BY group_id
  HAVING
    -- 취소 세션의 round_total > 활성 세션의 round_total 인 그룹만
    MAX(CASE WHEN status = 'cancelled' THEN round_total END) >
    MAX(CASE WHEN status NOT IN ('cancelled','deleted') THEN round_total END)
)
UPDATE sessions s
SET
  round_index = s.round_index + g.cancelled_count,
  round_total = g.correct_total,
  round_display = (s.round_index + g.cancelled_count)::text || '/' || g.correct_total::text
FROM group_stats g
WHERE s.group_id = g.group_id
  AND s.status NOT IN ('cancelled', 'deleted')
  AND s.round_total = g.active_total   -- 잘못 줄어든 total 값을 가진 행만
  AND g.correct_total IS NOT NULL
  AND g.active_total IS NOT NULL;

-- 2. 결과 확인 (실행 후 아래 SELECT 로 검증)
-- SELECT id, title, status, round_index, round_total, round_display, start_at
-- FROM sessions
-- WHERE group_id IN (
--   SELECT DISTINCT s.group_id FROM sessions s
--   WHERE s.status = 'cancelled' AND s.round_total = 8
-- )
-- ORDER BY group_id, start_at;
