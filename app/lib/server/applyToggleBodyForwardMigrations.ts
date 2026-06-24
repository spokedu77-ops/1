import type { SupabaseClient } from '@supabase/supabase-js';
import { planToggleBodyForwardMigrations } from '@/app/lib/note/toggleBody';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

/**
 * 노션 모델: toggle content.body → parent_block_id 자식 text 블록으로 영구 이전.
 */
export async function applyToggleBodyForwardMigrations(
  supabase: SupabaseClient,
  documentId: string,
  blocks: LoadedNoteBlock[],
  _actorId: string,
): Promise<LoadedNoteBlock[]> {
  const plans = planToggleBodyForwardMigrations(blocks);
  if (plans.length === 0) return blocks;

  const now = new Date().toISOString();
  let next = [...blocks];

  for (const plan of plans) {
    await supabase
      .from('note_blocks')
      .update({ content: plan.newToggleContent, updated_at: now })
      .eq('id', plan.toggleId);

    next = next.map((block) => (
      block.id === plan.toggleId
        ? { ...block, content: plan.newToggleContent }
        : block
    ));

    if (plan.updateChild) {
      await supabase
        .from('note_blocks')
        .update({ content: plan.updateChild.content, updated_at: now })
        .eq('id', plan.updateChild.id);
      next = next.map((block) => (
        block.id === plan.updateChild!.id
          ? { ...block, content: plan.updateChild!.content }
          : block
      ));
    }

    if (plan.createChild) {
      const { data: created, error } = await supabase
        .from('note_blocks')
        .insert({
          document_id: documentId,
          type: 'text',
          parent_block_id: plan.toggleId,
          order_index: plan.createChild.order_index,
          content: plan.createChild.content,
          updated_at: now,
        })
        .select(BLOCK_SELECT)
        .single();
      if (!error && created) {
        next.push(created as LoadedNoteBlock);
      }
    }
  }

  return next;
}
