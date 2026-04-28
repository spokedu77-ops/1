-- Silence "RLS enabled, no policy" without changing access semantics.
-- note_documents is accessed via admin API using service_role (getServiceSupabase).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'note_documents'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.note_documents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS note_documents_deny_all ON public.note_documents;

    CREATE POLICY note_documents_deny_all
      ON public.note_documents
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

