-- MOVE report: anonymous survey submissions (no phone)

CREATE TABLE IF NOT EXISTS public.move_report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  age_group VARCHAR(20) NOT NULL,
  profile_key VARCHAR(8) NOT NULL,
  profile_title VARCHAR(100) NOT NULL,
  survey_responses JSONB NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'move_report',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_report_submissions_created_at
  ON public.move_report_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_move_report_submissions_session
  ON public.move_report_submissions (session_id);

ALTER TABLE public.move_report_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "move_report_submissions_service_role" ON public.move_report_submissions;
CREATE POLICY "move_report_submissions_service_role"
  ON public.move_report_submissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
