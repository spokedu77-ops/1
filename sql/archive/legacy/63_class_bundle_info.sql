-- V2 번들(정렬된 group_id 목록)별 운영 수업 정보 (주소, 연락처 등)
CREATE TABLE IF NOT EXISTS public.class_bundle_info (
  bundle_key text PRIMARY KEY,
  address text,
  phone text,
  child_info text,
  tuition_paid boolean NOT NULL DEFAULT false,
  notes text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_bundle_info_updated_at ON public.class_bundle_info (updated_at DESC);

COMMENT ON TABLE public.class_bundle_info IS 'admin/classes-v2 번들 패널 탭2 수업 정보';
COMMENT ON COLUMN public.class_bundle_info.bundle_key IS '정렬된 group_id를 콤마로 이은 키';

ALTER TABLE public.class_bundle_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_bundle_info_select_admin" ON public.class_bundle_info;
DROP POLICY IF EXISTS "class_bundle_info_insert_admin" ON public.class_bundle_info;
DROP POLICY IF EXISTS "class_bundle_info_update_admin" ON public.class_bundle_info;
DROP POLICY IF EXISTS "class_bundle_info_delete_admin" ON public.class_bundle_info;

CREATE POLICY "class_bundle_info_select_admin" ON public.class_bundle_info
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "class_bundle_info_insert_admin" ON public.class_bundle_info
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "class_bundle_info_update_admin" ON public.class_bundle_info
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "class_bundle_info_delete_admin" ON public.class_bundle_info
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
