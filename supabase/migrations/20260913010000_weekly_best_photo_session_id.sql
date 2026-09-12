-- 주간베스트 포토도 지도안/피드백처럼 출처 세션(강사)을 남긴다.
ALTER TABLE public.weekly_best
  ADD COLUMN IF NOT EXISTS photo_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_best_photo_session_id
  ON public.weekly_best (photo_session_id);
