import type { SupabaseClient } from '@supabase/supabase-js';
import { planCanonicalizeBlockTree } from '@/app/lib/note/noteBlockTree';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

/** legacy depth를 canonical parent_block_id 트리로 영구 변환한다. */
export async function applyNoteBlockTreeMigrations(
  supabase: SupabaseClient,
  blocks: LoadedNoteBlock[],
): Promise<LoadedNoteBlock[]> {
  const plan = planCanonicalizeBlockTree(blocks);
  if (plan.patches.length === 0) return blocks;

  await Promise.all(
    plan.patches.map((patch) =>
      supabase
        .from('note_blocks')
        .update({
          parent_block_id: patch.parent_block_id,
          order_index: patch.order_index,
          ...(patch.content ? { content: patch.content } : {}),
        })
        .eq('id', patch.id),
    ),
  );

  return plan.blocks as LoadedNoteBlock[];
}
