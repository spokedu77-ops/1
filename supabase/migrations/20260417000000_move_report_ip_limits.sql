-- MOVE report: IP-based completion counts for rate limiting (service_role only)

CREATE TABLE IF NOT EXISTS public.move_report_ip_limits (
  ip TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_report_ip_limits_count ON public.move_report_ip_limits (count);

ALTER TABLE public.move_report_ip_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "move_report_ip_limits_service_role" ON public.move_report_ip_limits;
CREATE POLICY "move_report_ip_limits_service_role"
  ON public.move_report_ip_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
