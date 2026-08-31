-- Keep the public projection invoker-safe without widening mr_children RLS.
-- Viewers must not gain direct access to child_name or support_notes.

CREATE SCHEMA IF NOT EXISTS private;

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
    (SELECT public.mr_is_platform_admin())
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

REVOKE ALL ON FUNCTION private.mr_children_impact_safe_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.mr_children_impact_safe_rows() FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.mr_children_impact_safe_rows() TO authenticated;

CREATE OR REPLACE VIEW public.mr_children_impact_safe
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  safe.id,
  safe.child_code,
  safe.birth_year,
  safe.grade,
  safe.child_track,
  safe.data_consent,
  safe.media_consent,
  safe.created_at
FROM private.mr_children_impact_safe_rows() AS safe;

COMMENT ON VIEW public.mr_children_impact_safe IS
  'PII-safe child read path for VIEWER/Impact. SECURITY INVOKER wrapper over a locked-down private projection; never exposes child_name or support_notes.';

GRANT SELECT ON public.mr_children_impact_safe TO authenticated;
