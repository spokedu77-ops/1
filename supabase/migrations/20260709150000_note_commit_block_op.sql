-- Atomic op log commit: lock → verify base_seq → insert → update sync in ONE transaction.
-- Prevents duplicate seq races and sync_state drift from failed batch reservations.

CREATE OR REPLACE FUNCTION public.note_commit_block_op(
  p_document_id uuid,
  p_base_seq bigint,
  p_client_op_id text,
  p_op_type text,
  p_payload jsonb,
  p_actor_id uuid
)
RETURNS TABLE (
  status text,
  assigned_seq bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective bigint;
  v_next bigint;
  v_existing_seq bigint;
BEGIN
  INSERT INTO public.note_document_sync_state (document_id, last_seq)
  VALUES (p_document_id, 0)
  ON CONFLICT (document_id) DO NOTHING;

  -- 멱등: 이미 기록된 client_op_id
  SELECT o.seq INTO v_existing_seq
  FROM public.note_block_ops o
  WHERE o.document_id = p_document_id
    AND o.client_op_id = p_client_op_id;
  IF FOUND THEN
    RETURN QUERY SELECT 'duplicate'::text, v_existing_seq;
    RETURN;
  END IF;

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
  FOR UPDATE OF s;

  IF v_effective IS NULL OR v_effective <> p_base_seq THEN
    RETURN QUERY SELECT 'conflict'::text, NULL::bigint;
    RETURN;
  END IF;

  v_next := v_effective + 1;

  INSERT INTO public.note_block_ops (
    document_id,
    seq,
    client_op_id,
    actor_id,
    op_type,
    payload
  ) VALUES (
    p_document_id,
    v_next,
    p_client_op_id,
    p_actor_id,
    p_op_type,
    p_payload
  );

  UPDATE public.note_document_sync_state
  SET last_seq = v_next,
      updated_at = now()
  WHERE document_id = p_document_id;

  RETURN QUERY SELECT 'ok'::text, v_next;
EXCEPTION
  WHEN unique_violation THEN
    SELECT o.seq INTO v_existing_seq
    FROM public.note_block_ops o
    WHERE o.document_id = p_document_id
      AND o.client_op_id = p_client_op_id;
    IF FOUND THEN
      RETURN QUERY SELECT 'duplicate'::text, v_existing_seq;
    ELSE
      RETURN QUERY SELECT 'conflict'::text, NULL::bigint;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) IS
  'Atomically commits one note_block_op row; returns ok|duplicate|conflict.';

REVOKE EXECUTE ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.note_commit_block_op(uuid, bigint, text, text, jsonb, uuid) TO supabase_admin;
  END IF;
END
$$;

-- Repair any remaining drift.
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
