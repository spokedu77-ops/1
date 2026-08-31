-- The safe projection is authenticated-only. Remove grants inherited from
-- older Supabase default privileges before restoring the intended grant.
REVOKE ALL ON public.mr_children_impact_safe FROM PUBLIC;
REVOKE ALL ON public.mr_children_impact_safe FROM anon;
GRANT SELECT ON public.mr_children_impact_safe TO authenticated;
