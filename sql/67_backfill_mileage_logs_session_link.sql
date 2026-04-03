-- ============================================================
-- mileage_logs 정확 매핑 보정
-- 목적:
-- 1) mileage_logs에 session_id를 저장할 수 있게 컬럼 추가
-- 2) 과거 [수업연동] 로그를 session_count_logs/sessions 기준으로 매핑
-- 3) session_started_at/session_title(날짜)를 실제 수업일로 동기화
-- ============================================================

BEGIN;

-- 0) 컬럼 준비
ALTER TABLE public.mileage_logs
ADD COLUMN IF NOT EXISTS session_id uuid NULL;

ALTER TABLE public.mileage_logs
ADD COLUMN IF NOT EXISTS session_started_at timestamptz NULL;

-- FK는 데이터 정리 후 걸어도 됩니다. 일단 NULL 허용으로 추가.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_mileage_logs_session_id'
  ) THEN
    ALTER TABLE public.mileage_logs
      ADD CONSTRAINT fk_mileage_logs_session_id
      FOREIGN KEY (session_id) REFERENCES public.sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mileage_logs_session_id ON public.mileage_logs(session_id);

-- 1) 대상 추출
WITH target AS (
  SELECT
    ml.id,
    ml.teacher_id,
    ml.created_at,
    ml.reason,
    ml.session_title,
    regexp_replace(COALESCE(ml.session_title, ''), '\s*\([^)]*\)\s*$', '') AS base_title
  FROM mileage_logs ml
  WHERE ml.reason ~ '^\[수업연동'
),

-- 2) 우선 매칭: session_count_logs (teacher + title, created_at 근접)
cand_from_count_logs AS (
  SELECT
    t.id AS log_id,
    scl.session_id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - t.created_at))) ASC
    ) AS rn
  FROM target t
  JOIN session_count_logs scl
    ON scl.teacher_id = t.teacher_id
   AND regexp_replace(COALESCE(scl.session_title, ''), '\s*\([^)]*\)\s*$', '') = t.base_title
   AND scl.session_id IS NOT NULL
  JOIN sessions s ON s.id = scl.session_id
),
pick_count_logs AS (
  SELECT log_id, session_id, start_at
  FROM cand_from_count_logs
  WHERE rn = 1
),

-- 3) 보조 매칭: sessions (created_by + title, created_at 근접)
unresolved AS (
  SELECT t.*
  FROM target t
  LEFT JOIN pick_count_logs p ON p.log_id = t.id
  WHERE p.log_id IS NULL
),
cand_from_sessions AS (
  SELECT
    u.id AS log_id,
    s.id AS session_id,
    s.start_at,
    ROW_NUMBER() OVER (
      PARTITION BY u.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.start_at - u.created_at))) ASC
    ) AS rn
  FROM unresolved u
  JOIN sessions s
    ON s.created_by = u.teacher_id
   AND regexp_replace(COALESCE(s.title, ''), '\s*\([^)]*\)\s*$', '') = u.base_title
),
pick_sessions AS (
  SELECT log_id, session_id, start_at
  FROM cand_from_sessions
  WHERE rn = 1
),

final_pick AS (
  SELECT * FROM pick_count_logs
  UNION ALL
  SELECT * FROM pick_sessions
),
to_update AS (
  SELECT
    ml.id,
    fp.session_id,
    fp.start_at,
    regexp_replace(COALESCE(ml.session_title, ''), '\s*\([^)]*\)\s*$', '') AS base_title
  FROM mileage_logs ml
  JOIN final_pick fp ON fp.log_id = ml.id
)
UPDATE mileage_logs ml
SET
  session_id = tu.session_id,
  session_started_at = tu.start_at,
  session_title = CASE
    WHEN COALESCE(BTRIM(tu.base_title), '') = '' THEN
      TO_CHAR((tu.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD')
    ELSE
      tu.base_title || ' (' || TO_CHAR((tu.start_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD') || ')'
  END
FROM to_update tu
WHERE ml.id = tu.id;

-- 4) 점검 리포트
WITH t AS (
  SELECT COUNT(*) AS total
  FROM mileage_logs
  WHERE reason ~ '^\[수업연동'
),
m AS (
  SELECT COUNT(*) AS mapped
  FROM mileage_logs
  WHERE reason ~ '^\[수업연동'
    AND session_id IS NOT NULL
    AND session_started_at IS NOT NULL
)
SELECT
  t.total AS total_linked_logs,
  m.mapped AS mapped_logs,
  (t.total - m.mapped) AS unresolved_logs
FROM t, m;

COMMIT;

-- ------------------------------------------------------------
-- 김민창 단건 강제 정정 예시 (필요 시 실행)
-- ------------------------------------------------------------
-- UPDATE mileage_logs
-- SET
--   session_title = '동작 수업 연기 (2026.04.04)',
--   session_started_at = '2026-04-04 00:00:00+09'::timestamptz
-- WHERE teacher_id = (SELECT id FROM users WHERE name = '김민창' LIMIT 1)
--   AND reason ~ '^\[수업연동'
--   AND regexp_replace(COALESCE(session_title, ''), '\s*\([^)]*\)\s*$', '') = '동작 수업 연기'
--   AND session_title LIKE '%2026.04.03%';
