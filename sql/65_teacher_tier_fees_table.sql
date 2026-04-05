-- 등급표 자체를 운영에서 수정 가능하게 하는 테이블
CREATE TABLE IF NOT EXISTS public.teacher_tier_fees (
  tier_id text PRIMARY KEY,
  fee_private integer NOT NULL,
  fee_group integer NOT NULL,
  fee_center_main integer NOT NULL,
  fee_center_assist integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_tier_fees_tier_id_check CHECK (tier_id IN ('rookie', 'silver', 'gold', 'diamond', 'partner'))
);

INSERT INTO public.teacher_tier_fees (tier_id, fee_private, fee_group, fee_center_main, fee_center_assist)
VALUES
  ('rookie', 30000, 35000, 42500, 25000),
  ('silver', 31000, 37500, 42500, 27500),
  ('gold', 32000, 40000, 45000, 30000),
  ('diamond', 33000, 42500, 47500, 32500),
  ('partner', 35000, 45000, 50000, 35000)
ON CONFLICT (tier_id) DO NOTHING;

ALTER TABLE public.teacher_tier_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_tier_fees_select_admin" ON public.teacher_tier_fees;
DROP POLICY IF EXISTS "teacher_tier_fees_insert_admin" ON public.teacher_tier_fees;
DROP POLICY IF EXISTS "teacher_tier_fees_update_admin" ON public.teacher_tier_fees;
DROP POLICY IF EXISTS "teacher_tier_fees_delete_admin" ON public.teacher_tier_fees;

CREATE POLICY "teacher_tier_fees_select_admin" ON public.teacher_tier_fees
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "teacher_tier_fees_insert_admin" ON public.teacher_tier_fees
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "teacher_tier_fees_update_admin" ON public.teacher_tier_fees
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "teacher_tier_fees_delete_admin" ON public.teacher_tier_fees
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
