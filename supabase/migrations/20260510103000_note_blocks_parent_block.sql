-- Notion-style nested note blocks.
-- Existing rows are preserved; parent_block_id stays NULL until explicitly used.

ALTER TABLE public.note_blocks
  ADD COLUMN IF NOT EXISTS parent_block_id uuid REFERENCES public.note_blocks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_note_blocks_parent_block
  ON public.note_blocks(parent_block_id);

CREATE INDEX IF NOT EXISTS idx_note_blocks_document_parent_order
  ON public.note_blocks(document_id, parent_block_id, order_index);
