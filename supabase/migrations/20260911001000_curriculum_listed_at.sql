ALTER TABLE public.curriculum
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.curriculum
  ALTER COLUMN created_at SET DEFAULT now();

COMMENT ON COLUMN public.curriculum.created_at IS
  'Catalog listed time. MASTER NEW is derived from this timestamp for 14 days. Existing NULL rows are not new.';
