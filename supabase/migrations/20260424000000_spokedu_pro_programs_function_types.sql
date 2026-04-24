-- ============================================================
-- spokedu_pro_programs: function_types (다중 기능 종류)
-- - 기존 function_type(TEXT) 단일 선택은 유지(호환/필터용)
-- - UI에서는 function_types[]를 주로 사용
-- ============================================================

ALTER TABLE spokedu_pro_programs
  ADD COLUMN IF NOT EXISTS function_types TEXT[] DEFAULT NULL;

-- 기존 단일 값이 있으면 배열로 백필
UPDATE spokedu_pro_programs
SET function_types = ARRAY[function_type]
WHERE function_type IS NOT NULL
  AND (function_types IS NULL OR array_length(function_types, 1) IS NULL);

-- 인덱스: 배열 contains 필터용 (PostgREST cs)
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_function_types_gin
  ON spokedu_pro_programs
  USING GIN (function_types);

