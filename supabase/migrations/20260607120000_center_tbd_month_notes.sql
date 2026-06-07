-- 센터 미정 캘린더 월별 메모 (관리자 공유)
-- 브라우저 direct write 없음 — Admin API + service_role 만 사용

CREATE TABLE IF NOT EXISTS public.center_tbd_month_notes (
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  PRIMARY KEY (year, month)
);

CREATE INDEX IF NOT EXISTS center_tbd_month_notes_updated_at_idx
  ON public.center_tbd_month_notes (updated_at DESC);

ALTER TABLE public.center_tbd_month_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_tbd_month_notes_service_role_all" ON public.center_tbd_month_notes;

CREATE POLICY "center_tbd_month_notes_service_role_all"
  ON public.center_tbd_month_notes
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE public.center_tbd_month_notes IS
  '센터 미정 캘린더 월별 한 줄 메모 — 관리자 공유용.';
