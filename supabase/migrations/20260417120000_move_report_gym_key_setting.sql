-- MOVE report: 체육관·단체용 bypass 키 (어드민에서 확인·재발급)

CREATE TABLE IF NOT EXISTS public.move_report_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.move_report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "move_report_settings_service_role" ON public.move_report_settings;
CREATE POLICY "move_report_settings_service_role"
  ON public.move_report_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.move_report_settings (key, value)
VALUES ('gym_bypass_key', encode(gen_random_bytes(16), 'hex'))
ON CONFLICT (key) DO NOTHING;
