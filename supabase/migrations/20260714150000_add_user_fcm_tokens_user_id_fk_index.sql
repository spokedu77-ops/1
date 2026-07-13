-- Performance Advisor: Unindexed foreign keys on public.user_fcm_tokens
-- Cover user_id FK so parent auth.users deletes/updates do not scan the whole table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_fcm_tokens'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON public.user_fcm_tokens (user_id)';
  END IF;
END
$$;
