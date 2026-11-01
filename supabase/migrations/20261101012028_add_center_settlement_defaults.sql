-- Settlement templates belong to the operational center. Historical monthly
-- sheets and private-lesson policies are deliberately left untouched.
ALTER TABLE public.centers
  ADD COLUMN settlement_defaults jsonb NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT centers_settlement_defaults_object CHECK (jsonb_typeof(settlement_defaults) = 'object');
