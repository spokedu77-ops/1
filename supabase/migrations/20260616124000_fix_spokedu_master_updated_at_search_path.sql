-- Fix SPOKEDU MASTER updated_at trigger function search_path.
--
-- Supabase security advisor requires mutable functions to set an explicit
-- search_path. This trigger only uses pg_catalog.now(), so pg_catalog is
-- sufficient and keeps the function behavior unchanged.

alter function public.spokedu_master_set_updated_at()
  set search_path = pg_catalog;
