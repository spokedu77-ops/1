import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { planPromoteDocumentBlocksToRoot } from '@/app/lib/note/noteBlockTree';
import {
  findOrphanSubPageDocuments,
  planOrphanSubPageBlockInserts,
} from '@/app/lib/note/orphanSubPageBlocks';
import { planToggleBodyRestores } from '@/app/lib/note/toggleBody';

export type LoadedNoteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by';

const DOCUMENT_CHILD_SELECT = 'id, title';

/**
 * 문서 블록 1회 로드 + 토글 본문 복구·루트 승격·고아 page 블록 보정 (기존 클라이언트 loadBlocks 로직을 서버로 이관).
 */
export async function loadNoteDocumentBlocks(
  documentId: string,
  actorId: string,
): Promise<LoadedNoteBlock[]> {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: blocksData, error: blocksError } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })
    .limit(1000);

  if (blocksError) throw new Error(blocksError.message);

  let loadedBlocks = (blocksData ?? []) as LoadedNoteBlock[];

  const { data: trashedData } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .eq('document_id', documentId)
    .not('deleted_at', 'is', null)
    .order('order_index', { ascending: true })
    .limit(500);

  const trashedBlocks = (trashedData ?? []) as LoadedNoteBlock[];

  const restorePlans = planToggleBodyRestores(loadedBlocks, trashedBlocks);
  for (const plan of restorePlans) {
    await supabase
      .from('note_blocks')
      .update({ content: plan.restoredContent })
      .eq('id', plan.toggleId);
    if (plan.removeChildBlockId) {
      await supabase
        .from('note_blocks')
        .update({
          deleted_at: now,
          deleted_by: actorId,
          updated_at: now,
        })
        .eq('id', plan.removeChildBlockId)
        .is('deleted_at', null);
    }
    if (plan.purgeTrashedChildBlockId) {
      await supabase
        .from('note_blocks')
        .delete()
        .eq('id', plan.purgeTrashedChildBlockId);
    }
  }
  if (restorePlans.length > 0) {
    loadedBlocks = loadedBlocks
      .map((block) => {
        const plan = restorePlans.find((entry) => entry.toggleId === block.id);
        return plan ? { ...block, content: plan.restoredContent } : block;
      })
      .filter((block) => !restorePlans.some((entry) => entry.removeChildBlockId === block.id));
  }

  const promotePlans = planPromoteDocumentBlocksToRoot(loadedBlocks);
  if (promotePlans.patches.length > 0) {
    await Promise.all(
      promotePlans.patches.map((patch) =>
        supabase
          .from('note_blocks')
          .update({
            parent_block_id: patch.parent_block_id,
            order_index: patch.order_index,
          })
          .eq('id', patch.id),
      ),
    );
    loadedBlocks = promotePlans.blocks as LoadedNoteBlock[];
  }

  const { data: childDocs } = await supabase
    .from('note_documents')
    .select(DOCUMENT_CHILD_SELECT)
    .eq('parent_id', documentId)
    .is('deleted_at', null)
    .limit(100);

  const orphans = findOrphanSubPageDocuments(childDocs ?? [], loadedBlocks);
  const insertPlans = planOrphanSubPageBlockInserts(orphans, loadedBlocks);

  for (const plan of insertPlans) {
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

    if (!createError && created) {
      loadedBlocks = [...loadedBlocks, created as LoadedNoteBlock];
    }
  }

  return loadedBlocks.sort((a, b) => a.order_index - b.order_index);
}
