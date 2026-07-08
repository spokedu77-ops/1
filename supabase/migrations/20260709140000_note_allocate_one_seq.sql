-- Per-op atomic seq allocation with self-healing (GREATEST(sync.last_seq, MAX(ops.seq))).
-- Replaces batch reserve that could advance last_seq without successful inserts.

CREATE OR REPLACE FUNCTION public.note_allocate_one_seq(
  p_document_id uuid,
  p_base_seq bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective bigint;
  v_next bigint;
BEGIN
  INSERT INTO public.note_document_sync_state (document_id, last_seq)
  VALUES (p_document_id, 0)
  ON CONFLICT (document_id) DO NOTHING;

  -- Row lock: concurrent allocators serialize on this document.
  SELECT GREATEST(
    s.last_seq,
    COALESCE((
      SELECT MAX(o.seq)
      FROM public.note_block_ops o
      WHERE o.document_id = p_document_id
    ), 0)
  )
  INTO v_effective
  FROM public.note_document_sync_state s
  WHERE s.document_id = p_document_id
  FOR UPDATE;

  IF v_effective IS NULL THEN
    RETURN -1;
  END IF;

  IF v_effective <> p_base_seq THEN
    RETURN -1;
  END IF;

  v_next := v_effective + 1;

  UPDATE public.note_document_sync_state
  SET last_seq = v_next,
      updated_at = now()
  WHERE document_id = p_document_id;

  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.note_allocate_one_seq(uuid, bigint) IS
  'Atomically allocates the next op seq for one push op; returns seq or -1 on base_seq conflict.';

REVOKE EXECUTE ON FUNCTION public.note_allocate_one_seq(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.note_allocate_one_seq(uuid, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.note_allocate_one_seq(uuid, bigint) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.note_allocate_one_seq(uuid, bigint) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.note_allocate_one_seq(uuid, bigint) TO supabase_admin;
  END IF;
END
$$;

-- Repair drifted sync_state rows (last_seq ahead of actual ops).
UPDATE public.note_document_sync_state s
SET last_seq = COALESCE((
  SELECT MAX(o.seq)
  FROM public.note_block_ops o
  WHERE o.document_id = s.document_id
), 0),
updated_at = now()
WHERE s.last_seq <> COALESCE((
  SELECT MAX(o.seq)
  FROM public.note_block_ops o
  WHERE o.document_id = s.document_id
), 0);
