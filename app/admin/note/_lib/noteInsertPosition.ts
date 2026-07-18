import type { NoteBlock } from './types';

export function resolveInsertIndexAfterBlock(
  blocks: ReadonlyArray<NoteBlock>,
  afterBlock: Pick<NoteBlock, 'id' | 'parent_block_id'>,
): { parentId: string | null; insertIndex: number } {
  const parentId = afterBlock.parent_block_id ?? null;
  const siblings = blocks
    .filter((block) => (block.parent_block_id ?? null) === parentId)
    .sort((left, right) => left.order_index - right.order_index);
  const afterIndex = siblings.findIndex((block) => block.id === afterBlock.id);
  return {
    parentId,
    insertIndex: afterIndex >= 0 ? afterIndex + 1 : siblings.length,
  };
}

export function resolveFocusedInsertTarget(
  blocks: ReadonlyArray<NoteBlock>,
  focusedBlockId: string | null,
): { parentId: string | null; insertIndex: number } | null {
  if (!focusedBlockId) return null;
  const focusedBlock = blocks.find((block) => block.id === focusedBlockId);
  if (!focusedBlock) return null;
  return resolveInsertIndexAfterBlock(blocks, focusedBlock);
}
