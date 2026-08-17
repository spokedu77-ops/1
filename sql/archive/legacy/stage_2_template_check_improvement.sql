-- ===================================================================
-- Stage 2: 템플릿 체크 개선 - DB 스키마 변경
-- ===================================================================
-- 목적: 억지 조건 제거 및 구조화된 피드백 검증
-- 작성: 2026-01-21
-- ===================================================================

-- 1. sessions 테이블에 새로운 컬럼 추가
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS feedback_fields JSONB DEFAULT '{}';

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS completion_status JSONB DEFAULT '{}';

-- 2. 컬럼 설명 추가 (선택사항)
COMMENT ON COLUMN sessions.feedback_fields IS '구조화된 피드백 필드: {main_activity, strengths, improvements, next_goals, condition_notes}';
COMMENT ON COLUMN sessions.completion_status IS '완료 상태: {completed_fields[], required_fields[], uploaded_photos, required_photos, completion_rate}';

-- 3. 기존 데이터 마이그레이션
-- students_text의 템플릿을 파싱해서 feedback_fields로 변환
UPDATE sessions 
SET feedback_fields = jsonb_build_object(
  'main_activity', COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(
          regexp_replace(students_text, '.*✅ 오늘 수업의 주요 활동\s*-\s*', '', 'n'),
          '\s*✅ 강점 및 긍정적인 부분.*', '', 'n'
        )
      ), ''
    ), NULL
  ),
  'strengths', COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(
          regexp_replace(students_text, '.*✅ 강점 및 긍정적인 부분\s*-\s*', '', 'n'),
          '\s*✅ 개선이 필요한 부분.*', '', 'n'
        )
      ), ''
    ), NULL
  ),
  'improvements', COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(
          regexp_replace(students_text, '.*✅ 개선이 필요한 부분 및 피드백\s*-\s*', '', 'n'),
          '\s*✅ 다음 수업 목표 및 계획.*', '', 'n'
        )
      ), ''
    ), NULL
  ),
  'next_goals', COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(
          regexp_replace(students_text, '.*✅ 다음 수업 목표 및 계획\s*-\s*', '', 'n'),
          '\s*✅ 특이사항 및 컨디션 체크.*', '', 'n'
        )
      ), ''
    ), NULL
  ),
  'condition_notes', COALESCE(
    NULLIF(
      TRIM(
        regexp_replace(students_text, '.*✅ 특이사항 및 컨디션 체크\s*-\s*', '', 'ns')
      ), ''
    ), NULL
  )
)
WHERE students_text IS NOT NULL 
  AND students_text != '';

-- 4. completion_status 계산 및 업데이트
UPDATE sessions
SET completion_status = jsonb_build_object(
  'required_fields', ARRAY['main_activity', 'strengths', 'next_goals'],
  'completed_fields', (
    SELECT array_agg(field_name)
    FROM (
      SELECT 'main_activity' as field_name WHERE feedback_fields->>'main_activity' IS NOT NULL AND length(feedback_fields->>'main_activity') > 5
      UNION ALL
      SELECT 'strengths' WHERE feedback_fields->>'strengths' IS NOT NULL AND length(feedback_fields->>'strengths') > 5
      UNION ALL
      SELECT 'improvements' WHERE feedback_fields->>'improvements' IS NOT NULL AND length(feedback_fields->>'improvements') > 5
      UNION ALL
      SELECT 'next_goals' WHERE feedback_fields->>'next_goals' IS NOT NULL AND length(feedback_fields->>'next_goals') > 5
      UNION ALL
      SELECT 'condition_notes' WHERE feedback_fields->>'condition_notes' IS NOT NULL AND length(feedback_fields->>'condition_notes') > 5
    ) fields
  ),
  'required_photos', 3,
  'uploaded_photos', COALESCE(array_length(photo_url, 1), 0),
  'completion_rate', (
    (
      SELECT COUNT(*)::float
      FROM (
        SELECT 1 WHERE feedback_fields->>'main_activity' IS NOT NULL AND length(feedback_fields->>'main_activity') > 5
        UNION ALL
        SELECT 1 WHERE feedback_fields->>'strengths' IS NOT NULL AND length(feedback_fields->>'strengths') > 5
        UNION ALL
        SELECT 1 WHERE feedback_fields->>'next_goals' IS NOT NULL AND length(feedback_fields->>'next_goals') > 5
      ) completed
    ) / 3.0 * 100
  )
)
WHERE feedback_fields IS NOT NULL;

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sessions_completion_status ON sessions USING GIN (completion_status);
CREATE INDEX IF NOT EXISTS idx_sessions_feedback_fields ON sessions USING GIN (feedback_fields);

-- 6. 검증 쿼리
-- 변환된 데이터 샘플 확인
SELECT 
  id,
  title,
  LEFT(students_text, 50) as original_text,
  feedback_fields,
  completion_status
FROM sessions
WHERE students_text IS NOT NULL
LIMIT 5;

-- 완료율 통계
SELECT 
  CASE 
    WHEN (completion_status->>'completion_rate')::float >= 100 THEN '100% 완료'
    WHEN (completion_status->>'completion_rate')::float >= 66 THEN '66-99% 완료'
    WHEN (completion_status->>'completion_rate')::float >= 33 THEN '33-65% 완료'
    ELSE '0-32% 완료'
  END as completion_level,
  COUNT(*) as count
FROM sessions
WHERE completion_status IS NOT NULL
GROUP BY completion_level
ORDER BY completion_level DESC;

-- ===================================================================
-- 롤백 스크립트 (필요시 사용)
-- ===================================================================
-- ALTER TABLE sessions DROP COLUMN IF EXISTS feedback_fields;
-- ALTER TABLE sessions DROP COLUMN IF EXISTS completion_status;
-- DROP INDEX IF EXISTS idx_sessions_completion_status;
-- DROP INDEX IF EXISTS idx_sessions_feedback_fields;
