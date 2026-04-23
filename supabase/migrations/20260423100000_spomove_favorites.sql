-- SPOMOVE: IP 기반 즐겨찾기 설정 저장 (service_role only)

CREATE TABLE IF NOT EXISTS public.spomove_favorites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip          TEXT        NOT NULL,
  label       TEXT        NOT NULL DEFAULT '',
  payload     JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spomove_favorites_ip ON public.spomove_favorites (ip);
CREATE INDEX IF NOT EXISTS idx_spomove_favorites_ip_created ON public.spomove_favorites (ip, created_at DESC);

ALTER TABLE public.spomove_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spomove_favorites_service_role" ON public.spomove_favorites;
CREATE POLICY "spomove_favorites_service_role"
  ON public.spomove_favorites
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
