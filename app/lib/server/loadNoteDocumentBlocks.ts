import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { applyToggleBodyForwardMigrations } from './applyToggleBodyForwardMigrations';
import { applyNoteBlockTreeMigrations } from './applyNoteBlockTreeMigrations';
import { reconcileSubPagesOnDocumentLoad } from './reconcileSubPagesOnDocumentLoad';

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
  version: number;
};

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

/**
 * 문서 블록 1회 로드 + 토글 body→자식 forward migration·루트 승격·고아 page 블록·parent_id 보정.
 */
export async function loadNoteDocumentBlocks(
  documentId: string,
  actorId: string,
): Promise<LoadedNoteBlock[]> {
  const supabase = getServiceSupabase();

  const [blocksResult] = await Promise.all([
    supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .limit(1000),
  ]);

  if (blocksResult.error) throw new Error(blocksResult.error.message);

  let loadedBlocks = (blocksResult.data ?? []) as LoadedNoteBlock[];

  loadedBlocks = await applyToggleBodyForwardMigrations(
    supabase,
    documentId,
    loadedBlocks,
    actorId,
  );
  loadedBlocks = await applyNoteBlockTreeMigrations(supabase, loadedBlocks);

  loadedBlocks = await reconcileSubPagesOnDocumentLoad(supabase, documentId, loadedBlocks);

  return loadedBlocks;
}
