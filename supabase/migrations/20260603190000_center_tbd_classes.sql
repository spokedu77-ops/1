-- 센터 미정 캘린더 전용 테이블 (classes-v2 / sessions 와 무관)
-- 브라우저 direct write 없음 — Admin API + service_role 만 사용

CREATE TABLE IF NOT EXISTS public.center_tbd_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  main_teacher_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  extra_teacher_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  main_teacher_name text NOT NULL DEFAULT '',
  extra_teacher_name text NOT NULL DEFAULT '',
  round_total integer NOT NULL DEFAULT 1 CHECK (round_total >= 1 AND round_total <= 52),
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS center_tbd_classes_updated_at_idx
  ON public.center_tbd_classes (updated_at DESC);

ALTER TABLE public.center_tbd_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_tbd_classes_service_role_all" ON public.center_tbd_classes;

CREATE POLICY "center_tbd_classes_service_role_all"
  ON public.center_tbd_classes
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE public.center_tbd_classes IS
  '센터 미정 캘린더 — 관리자 공유용. sessions/classes-v2 와 연동하지 않음.';
