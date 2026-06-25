import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';
import { applyToggleBodyForwardMigrations } from './applyToggleBodyForwardMigrations';
import { applyNoteBlockTreeMigrations } from './applyNoteBlockTreeMigrations';
import { reconcileSubPagesOnDocumentLoad } from './reconcileSubPagesOnDocumentLoad';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

/** reconcile 없이 블록 SELECT + 토글 migration + 하위노트(page) 보정 (편집 진입 속도용) */
export async function loadNoteDocumentBlocksRaw(
  documentId: string,
  actorId: string,
): Promise<LoadedNoteBlock[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })
    .limit(1000);

  if (error) throw new Error(error.message);
  let blocks = (data ?? []) as LoadedNoteBlock[];
  blocks = await applyToggleBodyForwardMigrations(supabase, documentId, blocks, actorId);
  blocks = await applyNoteBlockTreeMigrations(supabase, blocks);
  blocks = await reconcileSubPagesOnDocumentLoad(supabase, documentId, blocks);
  return blocks;
}
