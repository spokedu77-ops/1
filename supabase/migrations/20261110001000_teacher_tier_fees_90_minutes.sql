-- Add explicit 90-minute rates. Existing session fees and individual overrides stay unchanged.
ALTER TABLE public.teacher_tier_fees
  ADD COLUMN IF NOT EXISTS fee_private_90 integer CHECK (fee_private_90 >= 0),
  ADD COLUMN IF NOT EXISTS fee_group_90 integer CHECK (fee_group_90 >= 0),
  ADD COLUMN IF NOT EXISTS fee_center_main_90 integer CHECK (fee_center_main_90 >= 0),
  ADD COLUMN IF NOT EXISTS fee_center_assist_90 integer CHECK (fee_center_assist_90 >= 0);

INSERT INTO public.teacher_tier_fees
  (tier_id, fee_private, fee_group, fee_center_main, fee_center_assist,
   fee_private_90, fee_group_90, fee_center_main_90, fee_center_assist_90)
VALUES
  ('rookie', 30000, 35000, 42500, 25000, 40000, 45000, 55000, 35000),
  ('silver', 31000, 37500, 42500, 26000, 41500, 47500, 55000, 36000),
  ('gold', 32000, 40000, 45000, 30000, 43000, 52500, 60000, 40000),
  ('diamond', 33000, 42500, 47500, 32500, 45000, 55000, 65000, 45000),
  ('partner', 35000, 45000, 50000, 35000, 47500, 60000, 70000, 50000)
ON CONFLICT (tier_id) DO UPDATE SET
  fee_private_90 = EXCLUDED.fee_private_90,
  fee_group_90 = EXCLUDED.fee_group_90,
  fee_center_main_90 = EXCLUDED.fee_center_main_90,
  fee_center_assist_90 = EXCLUDED.fee_center_assist_90,
  updated_at = now();

UPDATE public.teacher_tier_fees SET fee_center_assist = 26000, updated_at = now() WHERE tier_id = 'silver';
NOTIFY pgrst, 'reload schema';
