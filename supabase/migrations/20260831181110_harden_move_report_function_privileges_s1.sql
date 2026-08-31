-- S1: harden MOVE REPORT functions without changing function bodies, RLS,
-- view behavior, table grants, or application data.

-- Advisor 0011: pin lookup paths only. Signatures, bodies, volatility,
-- return types, and security modes remain unchanged.
ALTER FUNCTION public.mr_set_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.mr_frw_growth_phase_eligible(smallint, public.mr_frw_status)
  SET search_path = pg_catalog, public;

-- Advisor 0028: none of these privileged helpers is an anonymous product API.
REVOKE EXECUTE ON FUNCTION public.mr_audit_session_child_record()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mr_can_read_program(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mr_is_platform_admin()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mr_is_program_instructor(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mr_is_program_viewer(uuid)
  FROM PUBLIC, anon;

-- Advisor 0029: these helpers are trigger/internal-only. The two helpers used
-- directly by authenticated RLS policies remain executable below.
REVOKE EXECUTE ON FUNCTION public.mr_audit_session_child_record()
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mr_is_program_instructor(uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mr_is_program_viewer(uuid)
  FROM authenticated;

-- Preserve the exact RLS execution surface explicitly after PUBLIC is revoked.
GRANT EXECUTE ON FUNCTION public.mr_can_read_program(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mr_is_platform_admin()
  TO authenticated;

-- Preserve the pre-migration service-role execution surface.
GRANT EXECUTE ON FUNCTION public.mr_audit_session_child_record()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mr_can_read_program(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mr_is_platform_admin()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mr_is_program_instructor(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mr_is_program_viewer(uuid)
  TO service_role;
