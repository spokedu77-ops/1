import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeNoteBlockTree } from '@/app/lib/note/noteBlockSanitize';
import { pickMemoPadServerStructuralPatch } from '@/app/lib/note/noteMemoPadContract';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

/**
 * load 시 DB에 쓸 구조 수리 — Memo Pad M3: parent/type만.
 * order_index compaction은 in-memory 투영용, DB persist 금지.
 */
function structuralPatchFor(
  before: LoadedNoteBlock,
  after: LoadedNoteBlock,
): ReturnType<typeof pickMemoPadServerStructuralPatch> {
  return pickMemoPadServerStructuralPatch({
    parent_block_id: (before.parent_block_id ?? null) !== (after.parent_block_id ?? null)
      ? after.parent_block_id ?? null
      : undefined,
    type: before.type !== after.type ? after.type : undefined,
  });
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
    .filter((item): item is { id: string; patch: NonNullable<ReturnType<typeof pickMemoPadServerStructuralPatch>> } => !!item);

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
