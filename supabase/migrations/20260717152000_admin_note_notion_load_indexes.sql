-- Admin Note Notion-style load indexes.
-- These support the canonical block tree/page-block contract without changing data semantics.

CREATE INDEX IF NOT EXISTS idx_note_blocks_active_doc_parent_order
  ON public.note_blocks(document_id, parent_block_id, order_index)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_note_blocks_active_page_child
  ON public.note_blocks((content->>'page_document_id'), document_id, updated_at DESC, order_index, id)
  WHERE deleted_at IS NULL
    AND type = 'page'
    AND content ? 'page_document_id';

CREATE INDEX IF NOT EXISTS idx_note_documents_active_list
  ON public.note_documents(is_archived, is_pinned DESC, is_favorite DESC, updated_at DESC)
  WHERE deleted_at IS NULL;
