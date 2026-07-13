-- Drop redundant / obsolete indexes on spomove_favorites.
-- App now queries by user_id (not ip). Composite (user_id, created_at) covers
-- user_id-only lookups, so the single-column user_id index is redundant.
-- Do NOT drop FK-covering indexes on other tables (would re-open Unindexed FK).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spomove_favorites'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_spomove_favorites_ip';
    EXECUTE 'DROP INDEX IF EXISTS public.idx_spomove_favorites_ip_created';
    EXECUTE 'DROP INDEX IF EXISTS public.idx_spomove_favorites_user_id';
    -- keep: idx_spomove_favorites_user_created (user_id, created_at DESC)
  END IF;
END
$$;
