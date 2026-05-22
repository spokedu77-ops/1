-- 회차(round) 데이터 무결성 + 연기 슬롯 중복 방지
-- - index > total 같은 8/6 저장 차단
-- - 같은 group·같은 start_at에 postponed 2건 방지

-- 0) 연기 슬롯 중복(같은 group_id + start_at) 제거 — 유니크 인덱스 생성 전
WITH dup_postponed AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY group_id, start_at
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM public.sessions
  WHERE status = 'postponed'
    AND group_id IS NOT NULL
)
DELETE FROM public.sessions s
USING dup_postponed d
WHERE s.id = d.id
  AND d.rn > 1;

-- 1) 기존 비정상 행 보정 (표시·제약 통과용)
UPDATE public.sessions
SET
  round_index = LEAST(round_index, round_total),
  round_display = LEAST(round_index, round_total)::text || '/' || round_total::text
WHERE round_index IS NOT NULL
  AND round_total IS NOT NULL
  AND round_index > round_total
  AND round_total >= 1;

-- 2) round_index <= round_total (둘 다 있을 때)
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_round_index_lte_total;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_round_index_lte_total
  CHECK (
    round_index IS NULL
    OR round_total IS NULL
    OR (round_index >= 1 AND round_total >= 1 AND round_index <= round_total)
  );

-- 3) 같은 그룹·같은 시작 시각에 연기 기록 1건만
DROP INDEX IF EXISTS public.uniq_sessions_postponed_slot;

CREATE UNIQUE INDEX uniq_sessions_postponed_slot
  ON public.sessions (group_id, start_at)
  WHERE status = 'postponed' AND group_id IS NOT NULL;
