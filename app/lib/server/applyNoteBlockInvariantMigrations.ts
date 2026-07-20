import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeNoteBlockTree } from '@/app/lib/note/noteBlockSanitize';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

function structuralPatchFor(
  before: LoadedNoteBlock,
  after: LoadedNoteBlock,
): { parent_block_id?: string | null; order_index?: number } | null {
  const patch: { parent_block_id?: string | null; order_index?: number } = {};
  if ((before.parent_block_id ?? null) !== (after.parent_block_id ?? null)) {
    patch.parent_block_id = after.parent_block_id ?? null;
  }
  if (before.order_index !== after.order_index) {
    patch.order_index = after.order_index;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function applyNoteBlockInvariantMigrations(
  supabase: SupabaseClient,
  blocks: LoadedNoteBlock[],
): Promise<LoadedNoteBlock[]> {
  const sanitized = sanitizeNoteBlockTree(blocks) as LoadedNoteBlock[];
  const beforeById = new Map(blocks.map((block) => [block.id, block]));
  const patches = sanitized
    .map((block) => {
      const before = beforeById.get(block.id);
      if (!before) return null;
      const patch = structuralPatchFor(before, block);
      return patch ? { id: block.id, patch } : null;
    })
    .filter((item): item is { id: string; patch: { parent_block_id?: string | null; order_index?: number } } => !!item);

  if (patches.length === 0) return sanitized;

  await Promise.all(
    patches.map(({ id, patch }) =>
      supabase
        .from('note_blocks')
        .update(patch)
        .eq('id', id),
    ),
  );

  return sanitized;
}
