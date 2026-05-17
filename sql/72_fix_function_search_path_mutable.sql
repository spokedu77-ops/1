-- ================================================================
-- Fix: Function Search Path Mutable (security advisor)
-- 대상:
--   - public._spm_sub_set_updated_at
--   - public.update_spokedu_master_updated_at
-- ================================================================

-- 기존 로직은 유지하고, search_path만 고정합니다.
CREATE OR REPLACE FUNCTION public._spm_sub_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_spokedu_master_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

SELECT 'fixed function search_path for trigger helpers (72)' AS status;
