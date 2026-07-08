-- Atomic seq allocation for note_block_ops push (prevents duplicate seq races across tabs).
-- A single UPDATE ... WHERE last_seq = base is row-locked and serialized by Postgres,
-- so concurrent pushes either reserve a distinct contiguous range or get a conflict (-1).

CREATE OR REPLACE FUNCTION public.note_reserve_op_seqs(
  p_document_id uuid,
  p_base_seq bigint,
  p_count integer
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base bigint;
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN
    RETURN -1;
  END IF;

  INSERT INTO public.note_document_sync_state (document_id, last_seq)
  VALUES (p_document_id, 0)
  ON CONFLICT (document_id) DO NOTHING;

  UPDATE public.note_document_sync_state
  SET last_seq = last_seq + p_count,
      updated_at = now()
  WHERE document_id = p_document_id
    AND last_seq = p_base_seq
  RETURNING last_seq - p_count INTO v_base;

  IF v_base IS NULL THEN
    RETURN -1; -- base_seq mismatch => caller must pull & rebase
  END IF;

  RETURN v_base; -- reserved range is [v_base + 1 .. v_base + p_count]
END;
$$;

COMMENT ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) IS
  'Atomically reserves a contiguous seq range for note_block_ops; returns base or -1 on conflict.';

-- Server-only (service_role via admin API). Match the lockdown pattern of other note RPCs.
REVOKE EXECUTE ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.note_reserve_op_seqs(uuid, bigint, integer) TO supabase_admin;
  END IF;
END
$$;
