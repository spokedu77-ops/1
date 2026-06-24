import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

/** reconcile 없이 블록만 SELECT — 편집 진입 속도용 */
export async function loadNoteDocumentBlocksRaw(
  documentId: string,
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
  return (data ?? []) as LoadedNoteBlock[];
}
