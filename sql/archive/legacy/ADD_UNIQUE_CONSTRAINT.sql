-- ================================================================
-- iiwarmup_programs 테이블에 UNIQUE 제약 조건 추가
-- (year, month, week) 조합이 유일하도록 설정
-- ================================================================

-- 1. 기존 중복 데이터 확인
SELECT year, month, week, COUNT(*) as count
FROM iiwarmup_programs
GROUP BY year, month, week
HAVING COUNT(*) > 1;

-- 2. 중복 데이터가 있으면 먼저 정리 (최신 것만 남기고 삭제)
WITH ranked_programs AS (
  SELECT 
    id,
    year,
    month,
    week,
    ROW_NUMBER() OVER (PARTITION BY year, month, week ORDER BY created_at DESC) as rn
  FROM iiwarmup_programs
)
DELETE FROM iiwarmup_programs
WHERE id IN (
  SELECT id FROM ranked_programs WHERE rn > 1
);

-- 3. UNIQUE 제약 조건 추가
ALTER TABLE iiwarmup_programs
ADD CONSTRAINT iiwarmup_programs_year_month_week_unique
UNIQUE (year, month, week);

-- 4. 제약 조건 확인
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'iiwarmup_programs'
ORDER BY tc.constraint_type, kcu.column_name;

-- 완료
SELECT 'UNIQUE constraint added successfully!' AS status;
