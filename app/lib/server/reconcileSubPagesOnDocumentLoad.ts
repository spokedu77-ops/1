import type { SupabaseClient } from '@supabase/supabase-js';
import { reconcileDocumentParents } from '@/app/lib/note/documentParentSync';
import {
  findOrphanSubPageDocuments,
  planOrphanSubPageBlockInserts,
} from '@/app/lib/note/orphanSubPageBlocks';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

const DOCUMENT_CHILD_SELECT = 'id, title';

/**
 * 한 문서 로드 시: parent_id 자식 중 page 블록 없는 고아 → page 블록 생성,
 * page 블록이 가리키는 하위 문서 parent_id 보정.
 */
export async function reconcileSubPagesOnDocumentLoad(
  supabase: SupabaseClient,
  documentId: string,
  loadedBlocks: LoadedNoteBlock[],
): Promise<LoadedNoteBlock[]> {
  let blocks = loadedBlocks;

  const { data: childDocs } = await supabase
    .from('note_documents')
    .select(DOCUMENT_CHILD_SELECT)
    .eq('parent_id', documentId)
    .is('deleted_at', null)
    .limit(100);

  const orphans = findOrphanSubPageDocuments(childDocs ?? [], blocks);
  const insertPlans = planOrphanSubPageBlockInserts(orphans, blocks);

  if (insertPlans.length > 0) {
    const createdBlocks = await Promise.all(
      insertPlans.map(async (plan) => {
        const { data: created, error: createError } = await supabase
          .from('note_blocks')
          .insert({
            document_id: documentId,
            type: 'page',
            content: plan.content,
            order_index: plan.order_index,
            parent_block_id: null,
          })
          .select(BLOCK_SELECT)
          .single();
        if (createError || !created) return null;
        return created as LoadedNoteBlock;
      }),
    );
    for (const created of createdBlocks) {
      if (created) blocks = [...blocks, created];
    }
  }

  const linkedChildIds = [
    ...new Set(
      blocks
        .filter((block) => block.type === 'page' && typeof block.content?.page_document_id === 'string')
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

  return blocks.sort((a, b) => a.order_index - b.order_index);
}
