-- =====================================================
-- 기존 수업 라운드 정보 일괄 업데이트
-- =====================================================
-- 이 스크립트는 group_id가 있는 기존 세션들에 대해
-- 회차 정보(round_index, round_total, round_display)를 자동으로 계산하여 업데이트합니다.
--
-- 실행 방법:
-- 1. Supabase SQL Editor에서 이 파일 내용을 붙여넣기
-- 2. 실행 버튼 클릭
-- 
-- 주의사항:
-- - 이미 회차 정보가 있는 세션은 건너뜁니다
-- - group_id가 없는 세션은 업데이트하지 않습니다
-- =====================================================

-- 그룹별로 회차 정보 자동 계산 및 업데이트
WITH group_sessions AS (
  SELECT 
    id,
    group_id,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY start_at) as idx,
    COUNT(*) OVER (PARTITION BY group_id) as total
  FROM sessions
  WHERE group_id IS NOT NULL
)
UPDATE sessions s
SET 
  round_index = gs.idx,
  round_total = gs.total,
  round_display = gs.idx || '/' || gs.total
FROM group_sessions gs
WHERE s.id = gs.id
  AND (s.round_index IS NULL OR s.round_total IS NULL OR s.round_display IS NULL);

-- 업데이트된 행 수 확인
SELECT COUNT(*) as updated_sessions
FROM sessions
WHERE group_id IS NOT NULL
  AND round_index IS NOT NULL
  AND round_total IS NOT NULL
  AND round_display IS NOT NULL;
