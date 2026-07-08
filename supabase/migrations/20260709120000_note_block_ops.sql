-- Append-only op log for local-first note sync (materialized state stays in note_blocks)

CREATE TABLE IF NOT EXISTS public.note_document_sync_state (
  document_id uuid PRIMARY KEY REFERENCES public.note_documents(id) ON DELETE CASCADE,
  last_seq bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_document_sync_state IS
  'Per-document monotonic op sequence cursor for note_block_ops replay.';

CREATE TABLE IF NOT EXISTS public.note_block_ops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.note_documents(id) ON DELETE CASCADE,
  seq bigint NOT NULL,
  client_op_id text NOT NULL,
  actor_id uuid,
  op_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_block_ops_document_seq_unique UNIQUE (document_id, seq),
  CONSTRAINT note_block_ops_document_client_op_unique UNIQUE (document_id, client_op_id)
);

CREATE INDEX IF NOT EXISTS idx_note_block_ops_document_seq
  ON public.note_block_ops (document_id, seq);

COMMENT ON TABLE public.note_block_ops IS
  'Append-only note block operations; note_blocks remains materialized snapshot.';

ALTER TABLE public.note_document_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_block_ops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS note_document_sync_state_deny_all ON public.note_document_sync_state;
CREATE POLICY note_document_sync_state_deny_all
  ON public.note_document_sync_state
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS note_block_ops_deny_all ON public.note_block_ops;
CREATE POLICY note_block_ops_deny_all
  ON public.note_block_ops
  FOR ALL
  USING (false)
  WITH CHECK (false);
