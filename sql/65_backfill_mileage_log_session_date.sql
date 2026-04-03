-- ============================================================
-- mileage_logs 과거 데이터 보정:
--   [수업연동] 로그의 session_title 에 수업 날짜를 붙인다.
--
-- 대상:
--   - reason 이 [수업연동] 또는 [수업연동/보조] 로 시작
--   - session_title 이 비어있지 않음
--   - session_title 끝에 "(YYYY..)" 형태의 날짜가 아직 없음
--
-- 매칭 우선순위:
--   1) session_count_logs (teacher_id + session_title) -> session_id -> sessions.start_at
--   2) sessions (title + created_by=teacher_id) fallback
--
-- 주의:
--   - 같은 제목 수업이 반복된 경우를 고려해, created_at 과 시간 차가 가장 작은 후보를 사용
--   - 이미 날짜가 붙은 title 은 건드리지 않음
-- ============================================================

BEGIN;

-- 0) 사전 점검: 보정 대상 건수
SELECT COUNT(*) AS target_count
FROM mileage_logs ml
WHERE ml.reason ~ '^\[수업연동'
  AND COALESCE(BTRIM(ml.session_title), '') <> ''
  AND ml.session_title !~ '\([^()]*[0-9]{4}[^()]*[0-9]{1,2}[^()]*[0-9]{1,2}[^()]*\)\s*$';

WITH target_logs AS (
  SELECT
    ml.id,
    ml.teacher_id,
    ml.session_title,
    ml.created_at
  FROM mileage_logs ml
  WHERE ml.reason ~ '^\[수업연동'
    AND COALESCE(BTRIM(ml.session_title), '') <> ''
    AND ml.session_title !~ '\([^()]*[0-9]{4}[^()]*[0-9]{1,2}[^()]*[0-9]{1,2}[^()]*\)\s*$'
),

-- 1차: session_count_logs 기반 매칭 (정확도 우선)
best_from_count_logs AS (
  SELECT
    t.id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - t.created_at))) ASC
    ) AS rn
  FROM target_logs t
  JOIN session_count_logs scl
    ON scl.teacher_id = t.teacher_id
   AND scl.session_title = t.session_title
   AND scl.session_id IS NOT NULL
  JOIN sessions s
    ON s.id = scl.session_id
),
resolved_count_logs AS (
  SELECT id, start_at
  FROM best_from_count_logs
  WHERE rn = 1
),

-- 2차: fallback (main 강사 기준 title + created_by)
unresolved AS (
  SELECT t.*
  FROM target_logs t
  LEFT JOIN resolved_count_logs r
    ON r.id = t.id
  WHERE r.id IS NULL
),
best_from_sessions_main AS (
  SELECT
    u.id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY u.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - u.created_at))) ASC
    ) AS rn
  FROM unresolved u
  JOIN sessions s
    ON s.title = u.session_title
   AND s.created_by = u.teacher_id
),
resolved_sessions_main AS (
  SELECT id, start_at
  FROM best_from_sessions_main
  WHERE rn = 1
),

final_match AS (
  SELECT id, start_at FROM resolved_count_logs
  UNION ALL
  SELECT id, start_at FROM resolved_sessions_main
),
match_stats AS (
  SELECT
    (SELECT COUNT(*) FROM target_logs) AS total_targets,
    (SELECT COUNT(*) FROM final_match) AS matched_targets
),

to_update AS (
  SELECT
    ml.id,
    ml.session_title AS old_session_title,
    ml.session_title || ' (' || TO_CHAR((fm.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD') || ')' AS new_session_title
  FROM mileage_logs ml
  JOIN final_match fm
    ON fm.id = ml.id
)
SELECT
  total_targets,
  matched_targets,
  (total_targets - matched_targets) AS unmatched_targets
FROM match_stats;

WITH target_logs AS (
  SELECT
    ml.id,
    ml.teacher_id,
    ml.session_title,
    ml.created_at
  FROM mileage_logs ml
  WHERE ml.reason ~ '^\[수업연동'
    AND COALESCE(BTRIM(ml.session_title), '') <> ''
    AND ml.session_title !~ '\([^()]*[0-9]{4}[^()]*[0-9]{1,2}[^()]*[0-9]{1,2}[^()]*\)\s*$'
),
best_from_count_logs AS (
  SELECT
    t.id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - t.created_at))) ASC
    ) AS rn
  FROM target_logs t
  JOIN session_count_logs scl
    ON scl.teacher_id = t.teacher_id
   AND scl.session_title = t.session_title
   AND scl.session_id IS NOT NULL
  JOIN sessions s
    ON s.id = scl.session_id
),
resolved_count_logs AS (
  SELECT id, start_at
  FROM best_from_count_logs
  WHERE rn = 1
),
unresolved AS (
  SELECT t.*
  FROM target_logs t
  LEFT JOIN resolved_count_logs r
    ON r.id = t.id
  WHERE r.id IS NULL
),
best_from_sessions_main AS (
  SELECT
    u.id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY u.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - u.created_at))) ASC
    ) AS rn
  FROM unresolved u
  JOIN sessions s
    ON s.title = u.session_title
   AND s.created_by = u.teacher_id
),
resolved_sessions_main AS (
  SELECT id, start_at
  FROM best_from_sessions_main
  WHERE rn = 1
),
final_match AS (
  SELECT id, start_at FROM resolved_count_logs
  UNION ALL
  SELECT id, start_at FROM resolved_sessions_main
),
to_update AS (
  SELECT
    ml.id,
    ml.session_title || ' (' || TO_CHAR((fm.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD') || ')' AS new_session_title
  FROM mileage_logs ml
  JOIN final_match fm
    ON fm.id = ml.id
)
UPDATE mileage_logs ml
SET session_title = tu.new_session_title
FROM to_update tu
WHERE ml.id = tu.id;

-- 1) 결과 확인: 실제 변경된 샘플 100건
SELECT
  ml.id,
  ml.teacher_id,
  ml.reason,
  ml.created_at,
  ml.session_title
FROM mileage_logs ml
WHERE ml.reason ~ '^\[수업연동'
  AND ml.session_title ~ '\([0-9]{4}\.[0-9]{2}\.[0-9]{2}\)\s*$'
ORDER BY ml.created_at DESC
LIMIT 100;

COMMIT;

-- 롤백이 필요하면:
-- ROLLBACK;
