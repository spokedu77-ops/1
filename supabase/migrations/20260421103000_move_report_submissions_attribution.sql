-- MOVE 리포트: 설문 제출 행에 attribution(UTM·ref·referrer_host 등) 저장
ALTER TABLE public.move_report_submissions
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb;
