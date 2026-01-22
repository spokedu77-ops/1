-- ================================================================
-- 웜업 프로그램 상태 확인
-- ================================================================

-- 1. 현재 주차 계산
SELECT 
  EXTRACT(YEAR FROM NOW()) AS current_year,
  EXTRACT(MONTH FROM NOW()) AS current_month,
  CEIL(EXTRACT(DAY FROM NOW()) / 7.0) AS current_week;

-- 2. 단일 웜업 프로그램 확인 (iiwarmup_programs)
SELECT 
  year,
  month,
  week,
  title,
  is_active,
  content_type
FROM iiwarmup_programs
ORDER BY year DESC, month DESC, week DESC
LIMIT 10;

-- 3. 복합 웜업 프로그램 확인 (warmup_programs_composite)
SELECT 
  id,
  week_id,
  title,
  total_duration,
  is_active,
  phases
FROM warmup_programs_composite
ORDER BY week_id DESC
LIMIT 10;

-- 4. Play 시나리오 확인 (play_scenarios)
SELECT 
  id,
  name,
  theme,
  duration
FROM play_scenarios
LIMIT 10;
