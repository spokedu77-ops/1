-- ============================================================
-- 전체 강사 로그 정합성 보정 (전수)
-- 대상:
--   1) mileage_logs: [수업연동*]의 날짜를 session_id 기준으로 동기화
--   2) session_count_logs: session_id 누락/오염 건을 teacher+title+시간근접으로 복구
--      (유니크 충돌 시 중복 로그 삭제)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A) mileage_logs: session_id가 있는 [수업연동] 로그를 수업 날짜로 강제 동기화
-- ------------------------------------------------------------
WITH target AS (
  SELECT
    ml.id,
    COALESCE(NULLIF(BTRIM(regexp_replace(COALESCE(ml.session_title, ''), '\s*\([^)]*\)\s*$', '')), ''), s.title, '') AS base_title,
    s.start_at
  FROM mileage_logs ml
  JOIN sessions s ON s.id = ml.session_id
  WHERE ml.reason ~ '^\[수업연동'
)
UPDATE mileage_logs ml
SET
  session_started_at = t.start_at,
  session_title = CASE
    WHEN COALESCE(BTRIM(t.base_title), '') = '' THEN
      TO_CHAR((t.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD')
    ELSE
      t.base_title || ' (' || TO_CHAR((t.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD') || ')'
  END
FROM target t
WHERE ml.id = t.id;

-- ------------------------------------------------------------
-- B) session_count_logs: session_id 누락/오염 보정
--   - reason='트리거: sessions.status sync' 건을 우선
--   - teacher_id + base_title + created_at 근접 세션으로 매칭
-- ------------------------------------------------------------
WITH raw AS (
  SELECT
    scl.id,
    scl.teacher_id,
    scl.session_id,
    scl.session_title,
    scl.created_at,
    regexp_replace(COALESCE(scl.session_title, ''), '\s*\([^)]*\)\s*$', '') AS no_date_title,
    regexp_replace(regexp_replace(COALESCE(scl.session_title, ''), '\s*\([^)]*\)\s*$', ''), '^\s*\d+\/\d+\s*', '') AS base_title
  FROM session_count_logs scl
  WHERE scl.reason = '트리거: sessions.status sync'
),
candidates AS (
  SELECT
    r.id AS log_id,
    r.teacher_id,
    s.id AS target_session_id,
    s.title AS target_title,
    s.start_at AS target_start_at,
    ROW_NUMBER() OVER (
      PARTITION BY r.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - r.created_at))) ASC
    ) AS rn
  FROM raw r
  JOIN sessions s
    ON s.created_by = r.teacher_id
   AND (
        regexp_replace(COALESCE(s.title, ''), '^\s*\d+\/\d+\s*', '') = r.base_title
     OR COALESCE(s.title, '') = r.no_date_title
   )
),
picked AS (
  SELECT log_id, teacher_id, target_session_id, target_title
  FROM candidates
  WHERE rn = 1
),
safe_update AS (
  SELECT p.*
  FROM picked p
  WHERE NOT EXISTS (
    SELECT 1
    FROM session_count_logs x
    WHERE x.teacher_id = p.teacher_id
      AND x.session_id = p.target_session_id
      AND x.id <> p.log_id
  )
),
conflict_rows AS (
  SELECT p.log_id
  FROM picked p
  WHERE EXISTS (
    SELECT 1
    FROM session_count_logs x
    WHERE x.teacher_id = p.teacher_id
      AND x.session_id = p.target_session_id
      AND x.id <> p.log_id
  )
)
UPDATE session_count_logs scl
SET
  session_id = u.target_session_id,
  session_title = u.target_title
FROM safe_update u
WHERE scl.id = u.log_id;

-- 유니크 충돌 나는 중복 로그는 삭제
WITH raw AS (
  SELECT
    scl.id,
    scl.teacher_id,
    scl.session_id,
    scl.session_title,
    scl.created_at,
    regexp_replace(COALESCE(scl.session_title, ''), '\s*\([^)]*\)\s*$', '') AS no_date_title,
    regexp_replace(regexp_replace(COALESCE(scl.session_title, ''), '\s*\([^)]*\)\s*$', ''), '^\s*\d+\/\d+\s*', '') AS base_title
  FROM session_count_logs scl
  WHERE scl.reason = '트리거: sessions.status sync'
),
candidates AS (
  SELECT
    r.id AS log_id,
    r.teacher_id,
    s.id AS target_session_id,
    ROW_NUMBER() OVER (
      PARTITION BY r.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - r.created_at))) ASC
    ) AS rn
  FROM raw r
  JOIN sessions s
    ON s.created_by = r.teacher_id
   AND (
        regexp_replace(COALESCE(s.title, ''), '^\s*\d+\/\d+\s*', '') = r.base_title
     OR COALESCE(s.title, '') = r.no_date_title
   )
),
picked AS (
  SELECT log_id, teacher_id, target_session_id
  FROM candidates
  WHERE rn = 1
),
conflict_rows AS (
  SELECT p.log_id
  FROM picked p
  WHERE EXISTS (
    SELECT 1
    FROM session_count_logs x
    WHERE x.teacher_id = p.teacher_id
      AND x.session_id = p.target_session_id
      AND x.id <> p.log_id
  )
)
DELETE FROM session_count_logs scl
WHERE scl.id IN (SELECT log_id FROM conflict_rows);

-- ------------------------------------------------------------
-- C) 결과 검증
-- ------------------------------------------------------------
SELECT
  COUNT(*) FILTER (WHERE reason ~ '^\[수업연동') AS linked_mileage_total,
  COUNT(*) FILTER (WHERE reason ~ '^\[수업연동' AND session_id IS NULL) AS linked_mileage_missing_session_id,
  COUNT(*) FILTER (WHERE reason ~ '^\[수업연동' AND session_started_at IS NULL) AS linked_mileage_missing_session_started_at
FROM mileage_logs;

SELECT
  COUNT(*) AS trigger_count_logs_total,
  COUNT(*) FILTER (WHERE reason = '트리거: sessions.status sync' AND session_id IS NULL) AS trigger_missing_session_id
FROM session_count_logs;

COMMIT;
