-- Remove RLS-only SECURITY DEFINER helpers from the exposed public RPC schema
-- while preserving their OIDs, policy dependencies, signatures, and behavior.

CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.mr_is_platform_admin()
  SET SCHEMA private;

ALTER FUNCTION public.mr_can_read_program(uuid)
  SET SCHEMA private;

-- Every referenced object is schema-qualified, so use an empty lookup path for
-- privileged functions.
ALTER FUNCTION private.mr_is_platform_admin()
  SET search_path = '';

CREATE OR REPLACE FUNCTION private.mr_can_read_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT private.mr_is_platform_admin())
    OR (SELECT public.mr_is_program_instructor(p_program_id))
    OR (SELECT public.mr_is_program_viewer(p_program_id));
$$;

-- The existing safe projection remains identical except for the helper's new
-- schema-qualified location.
CREATE OR REPLACE FUNCTION private.mr_children_impact_safe_rows()
RETURNS TABLE (
  id uuid,
  child_code text,
  birth_year integer,
  grade public.mr_grade,
  child_track public.mr_child_track,
  data_consent public.mr_consent_status,
  media_consent public.mr_consent_status,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id,
    c.child_code,
    c.birth_year,
    c.grade,
    c.child_track,
    c.data_consent,
    c.media_consent,
    c.created_at
  FROM public.mr_children AS c
  WHERE
    (SELECT private.mr_is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.mr_program_children AS pc
      JOIN public.mr_program_instructors AS pi
        ON pi.program_id = pc.program_id
      WHERE pc.child_id = c.id
        AND pi.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.mr_program_children AS pc
      JOIN public.mr_program_viewers AS pv
        ON pv.program_id = pc.program_id
      WHERE pc.child_id = c.id
        AND pv.user_id = (SELECT auth.uid())
        AND pv.impact_report_approved IS TRUE
    );
$$;

REVOKE ALL ON FUNCTION private.mr_is_platform_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.mr_can_read_program(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.mr_children_impact_safe_rows() FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mr_is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mr_can_read_program(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mr_children_impact_safe_rows() TO authenticated;

NOTIFY pgrst, 'reload schema';
