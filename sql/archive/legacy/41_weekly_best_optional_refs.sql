-- 주간베스트: 지도안/피드백 없음 선택 허용 (NULL 허용)

ALTER TABLE weekly_best
  ALTER COLUMN lesson_plan_session_id DROP NOT NULL,
  ALTER COLUMN feedback_session_id DROP NOT NULL;

-- 기존 FK는 유지 (NULL이면 참조 안 함)
