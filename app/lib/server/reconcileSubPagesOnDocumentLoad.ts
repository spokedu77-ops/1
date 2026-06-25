import type { SupabaseClient } from '@supabase/supabase-js';
import { reconcileDocumentParents } from '@/app/lib/note/documentParentSync';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

/**
 * Page blocks are canonical. Loading may repair document parent metadata,
 * but it must never recreate missing page blocks.
 */
export async function reconcileSubPagesOnDocumentLoad(
  supabase: SupabaseClient,
  _documentId: string,
  loadedBlocks: LoadedNoteBlock[],
): Promise<LoadedNoteBlock[]> {
  const linkedChildIds = [
    ...new Set(
      loadedBlocks
        .filter((block) =>
          block.type === 'page'
          && typeof block.content?.page_document_id === 'string')
        .map((block) => (block.content!.page_document_id as string).trim())
        .filter(Boolean),
    ),
  ];

  if (linkedChildIds.length > 0) {
    const { data: linkedDocs } = await supabase
      .from('note_documents')
      .select('id, parent_id')
      .in('id', linkedChildIds)
      .is('deleted_at', null);
    if (linkedDocs?.length) {
      await reconcileDocumentParents(supabase, linkedDocs);
    }
  }

  return [...loadedBlocks].sort((a, b) => a.order_index - b.order_index);
}
