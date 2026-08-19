import { getServiceSupabase } from '@/app/lib/server/adminAuth';

import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

/** Load document blocks without reconciliation or migration for fast entry and prefetch. */
export async function loadNoteDocumentBlocksRaw(
  documentId: string,
  actorId: string,
): Promise<LoadedNoteBlock[]> {
  void actorId;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })
    .limit(1000);

  if (error) throw new Error(error.message);
  return (data ?? []) as LoadedNoteBlock[];
}
