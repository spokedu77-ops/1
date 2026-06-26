import {
  applyBlockDropPlanInMemory,
  collectBlockForestIds,
  planBlockDropAt,
  planMergeWithPreviousBlock,
  planMoveRootBlockGroup,
  type BlockDropPlan,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';

export type NoteBlockCommandResult = {
  nextBlocks: NoteBlock[];
  affectedIds: string[];
  orders: Array<{ id: string; order_index: number }>;
  fieldPatches: NoteBlockFieldPatch[];
  createdBlocks: NoteBlock[];
  removedBlocks: NoteBlock[];
};

function emptyCommandResult(blocks: NoteBlock[]): NoteBlockCommandResult {
  return {
    nextBlocks: blocks,
    affectedIds: [],
    orders: [],
    fieldPatches: [],
    createdBlocks: [],
    removedBlocks: [],
  };
}

function contentsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export function collectBlockTransactionIds(
  previous: NoteBlock[],
  next: NoteBlock[],
): string[] {
  const previousById = new Map(previous.map((block) => [block.id, block]));
  const nextById = new Map(next.map((block) => [block.id, block]));
  const changed = next
    .filter((block) => {
      const before = previousById.get(block.id);
      return !before
        || (before.parent_block_id ?? null) !== (block.parent_block_id ?? null)
        || before.order_index !== block.order_index
        || !contentsEqual(before.content, block.content);
    })
    .map((block) => block.id);
  for (const block of previous) {
    if (!nextById.has(block.id)) changed.push(block.id);
  }
  return changed;
}

export function buildMoveBlockCommand(
  blocks: NoteBlock[],
  movingId: string,
  plan: BlockDropPlan<NoteBlock>,
): NoteBlockCommandResult {
  const moving = blocks.find((block) => block.id === movingId);
  if (!moving) return emptyCommandResult(blocks);

  const nextBlocks = applyBlockDropPlanInMemory(blocks, movingId, plan);
  const affectedIds = collectBlockTransactionIds(blocks, nextBlocks);
  if (affectedIds.length === 0) return emptyCommandResult(blocks);

  const previousById = new Map(blocks.map((block) => [block.id, block]));
  const nextById = new Map(nextBlocks.map((block) => [block.id, block]));
  const changedBlocks = affectedIds
    .map((id) => nextById.get(id))
    .filter((block): block is NoteBlock => !!block);
  const orders = changedBlocks.map((block) => ({ id: block.id, order_index: block.order_index }));

  return {
    nextBlocks,
    affectedIds,
    orders,
    fieldPatches: changedBlocks.map((block) => {
      const before = previousById.get(block.id);
      return {
        id: block.id,
        parent_block_id: block.parent_block_id ?? null,
        order_index: block.order_index,
        ...(!contentsEqual(before?.content, block.content)
          ? { content: block.content }
          : {}),
      };
    }),
    createdBlocks: [],
    removedBlocks: [],
  };
}

function buildStructureCommandResult(
  previous: NoteBlock[],
  nextBlocks: NoteBlock[],
): NoteBlockCommandResult {
  const affectedIds = collectBlockTransactionIds(previous, nextBlocks);
  const previousById = new Map(previous.map((block) => [block.id, block]));
  const nextById = new Map(nextBlocks.map((block) => [block.id, block]));
  const changedBlocks = affectedIds
    .map((id) => nextById.get(id))
    .filter((block): block is NoteBlock => !!block);
  return {
    nextBlocks,
    affectedIds,
    orders: changedBlocks.map((block) => ({
      id: block.id,
      order_index: block.order_index,
    })),
    fieldPatches: changedBlocks.map((block) => {
      const before = previousById.get(block.id);
      return {
        id: block.id,
        parent_block_id: block.parent_block_id ?? null,
        order_index: block.order_index,
        ...(!contentsEqual(before?.content, block.content)
          ? { content: block.content }
          : {}),
      };
    }),
    createdBlocks: [],
    removedBlocks: [],
  };
}

export function buildMoveBlockGroupCommand(
  blocks: NoteBlock[],
  movingIds: string[],
  targetBlockId: string,
  position: BlockDropPosition,
): NoteBlockCommandResult {
  if (movingIds.length === 0 || movingIds.includes(targetBlockId)) {
    return emptyCommandResult(blocks);
  }

  if (position !== 'inside') {
    const nextRoots = planMoveRootBlockGroup(
      blocks,
      movingIds,
      targetBlockId,
      position,
    );
    if (!nextRoots) return emptyCommandResult(blocks);
    const rootMap = new Map(nextRoots.map((block) => [block.id, block]));
    return buildStructureCommandResult(
      blocks,
      blocks.map((block) => rootMap.get(block.id) ?? block),
    );
  }

  let nextBlocks = blocks;
  for (const movingId of movingIds) {
    const plan = planBlockDropAt(nextBlocks, movingId, targetBlockId, 'inside');
    if (!plan) return emptyCommandResult(blocks);
    nextBlocks = applyBlockDropPlanInMemory(nextBlocks, movingId, plan);
  }
  return buildStructureCommandResult(blocks, nextBlocks);
}

export function buildDeleteBlockForestCommand(
  blocks: NoteBlock[],
  rootIds: Iterable<string>,
): NoteBlockCommandResult {
  const affectedIds = collectBlockForestIds(rootIds, blocks);
  if (affectedIds.length === 0) return emptyCommandResult(blocks);

  const deleteSet = new Set(affectedIds);
  return {
    nextBlocks: blocks.filter((block) => !deleteSet.has(block.id)),
    affectedIds,
    orders: [],
    fieldPatches: [],
    createdBlocks: [],
    removedBlocks: blocks.filter((block) => deleteSet.has(block.id)),
  };
}

export function buildInsertBlockCommand(
  blocks: NoteBlock[],
  createdBlock: NoteBlock,
  parentId: string | null,
  insertIndex: number,
): NoteBlockCommandResult {
  if (blocks.some((block) => block.id === createdBlock.id)) {
    return emptyCommandResult(blocks);
  }

  const siblings = blocks
    .filter((block) => (block.parent_block_id ?? null) === parentId)
    .sort((left, right) => left.order_index - right.order_index);
  const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));
  const nextSiblings = [
    ...siblings.slice(0, clampedIndex),
    { ...createdBlock, parent_block_id: parentId },
    ...siblings.slice(clampedIndex),
  ].map((block, index) => ({ ...block, order_index: index }));
  const siblingById = new Map(nextSiblings.map((block) => [block.id, block]));
  const nextBlocks = blocks.map((block) => siblingById.get(block.id) ?? block);
  const inserted = siblingById.get(createdBlock.id)!;
  nextBlocks.push(inserted);

  return {
    nextBlocks,
    affectedIds: nextSiblings.map((block) => block.id),
    orders: nextSiblings.map((block) => ({
      id: block.id,
      order_index: block.order_index,
    })),
    fieldPatches: [],
    createdBlocks: [inserted],
    removedBlocks: [],
  };
}

export function buildMergeWithPreviousBlockCommand(
  blocks: NoteBlock[],
  blockId: string,
): (NoteBlockCommandResult & { focusBlockId: string; caretOffset: number }) | null {
  const plan = planMergeWithPreviousBlock(blocks, blockId);
  if (!plan) return null;
  const deleteSet = new Set(collectBlockForestIds([plan.deleteId], blocks));
  const nextBlocks = blocks
    .filter((block) => !deleteSet.has(block.id))
    .map((block) => (
      block.id === plan.previousId
        ? { ...block, content: plan.mergedContent }
        : block
    ));
  const affectedIds = [plan.previousId, ...deleteSet];
  return {
    nextBlocks,
    affectedIds,
    orders: [],
    fieldPatches: [{ id: plan.previousId, content: plan.mergedContent }],
    createdBlocks: [],
    removedBlocks: blocks.filter((block) => deleteSet.has(block.id)),
    focusBlockId: plan.previousId,
    caretOffset: plan.caretOffset,
  };
}
