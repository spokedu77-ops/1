-- Add covering indexes for warmup_programs_composite foreign keys (performance).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'warmup_programs_composite'
      AND c.relkind = 'r'
  ) THEN
    -- Cover FK warmup_programs_composite_parent_version_id_fkey
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_warmup_programs_composite_parent_version_id ON public.warmup_programs_composite (parent_version_id)';

    -- Cover FK warmup_programs_composite_owner_id_fkey
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_warmup_programs_composite_owner_id ON public.warmup_programs_composite (owner_id)';
  END IF;
END
$$;

