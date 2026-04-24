-- 센터 관리: 메인 강사 2·3, 담당 이메일, 운영/수업 히스토리

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS main_teacher_2_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS main_teacher_3_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.centers.main_teacher_2_id IS '메인 강사 2 (users.id)';
COMMENT ON COLUMN public.centers.main_teacher_3_id IS '메인 강사 3 (users.id)';
COMMENT ON COLUMN public.centers.contact_email IS '담당자 이메일';

CREATE TABLE IF NOT EXISTS public.center_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  center_id uuid NOT NULL REFERENCES public.centers (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now (),
  body text NOT NULL,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_center_history_center_created
  ON public.center_history (center_id, created_at DESC);

COMMENT ON TABLE public.center_history IS '센터 운영/수업 메모 히스토리 (관리자 기록)';

ALTER TABLE public.center_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_history_select_admin" ON public.center_history;
CREATE POLICY "center_history_select_admin"
  ON public.center_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "center_history_insert_admin" ON public.center_history;
CREATE POLICY "center_history_insert_admin"
  ON public.center_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')
    )
  );
