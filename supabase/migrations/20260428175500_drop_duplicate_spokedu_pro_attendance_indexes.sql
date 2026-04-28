-- Drop duplicate indexes on spokedu_pro_attendance (identical definitions).
-- Keep idx_spokedu_pro_attendance_center_date, drop spokedu_pro_attendance_center_date_idx.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spokedu_pro_attendance_center_date_idx'
      AND c.relkind = 'i'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'idx_spokedu_pro_attendance_center_date'
      AND c.relkind = 'i'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.spokedu_pro_attendance_center_date_idx';
  END IF;
END
$$;

