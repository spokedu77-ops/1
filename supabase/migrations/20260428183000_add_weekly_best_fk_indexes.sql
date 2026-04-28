-- Add covering indexes for weekly_best foreign keys (performance).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'weekly_best'
      AND c.relkind = 'r'
  ) THEN
    -- Cover FK weekly_best_lesson_plan_session_id_fkey
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_weekly_best_lesson_plan_session_id ON public.weekly_best (lesson_plan_session_id)';

    -- Also cover feedback_session_id FK if present
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_weekly_best_feedback_session_id ON public.weekly_best (feedback_session_id)';
  END IF;
END
$$;

