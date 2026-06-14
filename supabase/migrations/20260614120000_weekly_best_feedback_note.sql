-- 주간베스트: 센터 피드백이 비어 있을 때 admin이 직접 입력하는 메모
ALTER TABLE public.weekly_best
  ADD COLUMN IF NOT EXISTS feedback_note TEXT;
