import {
  applyBlockDropPlanInMemory,
  collectBlockForestIds,
  flattenVisualBlockIds,
  planBlockDropAt,
  planMergeWithPreviousBlock,
  planMoveRootBlockGroup,
  planMoveSiblingBlockGroup,
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
    const allRoot = movingIds.every((id) => {
      const block = blocks.find((item) => item.id === id);
      return !block?.parent_block_id;
    });
    if (allRoot) {
      const nextRoots = planMoveRootBlockGroup(
        blocks,
        movingIds,
        targetBlockId,
        position,
      );
      if (nextRoots) {
        const rootMap = new Map(nextRoots.map((block) => [block.id, block]));
        return buildStructureCommandResult(
          blocks,
          blocks.map((block) => rootMap.get(block.id) ?? block),
        );
      }
    }

    const nextSiblings = planMoveSiblingBlockGroup(
      blocks,
      movingIds,
      targetBlockId,
      position,
    );
    if (nextSiblings) return buildStructureCommandResult(blocks, nextSiblings);

    let nextBlocks = blocks;
    const visualIds = flattenVisualBlockIds(blocks);
    const ordered = [...movingIds].sort(
      (a, b) => visualIds.indexOf(a) - visualIds.indexOf(b),
    );
    for (const movingId of ordered) {
      const plan = planBlockDropAt(nextBlocks, movingId, targetBlockId, position);
      if (!plan) return emptyCommandResult(blocks);
      nextBlocks = applyBlockDropPlanInMemory(nextBlocks, movingId, plan);
    }
    return buildStructureCommandResult(blocks, nextBlocks);
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

export function buildInsertBlockAndReparentChildrenCommand(
  blocks: NoteBlock[],
  createdBlock: NoteBlock,
  parentId: string | null,
  insertIndex: number,
  childIds: string[],
): NoteBlockCommandResult {
  const insertCommand = buildInsertBlockCommand(blocks, createdBlock, parentId, insertIndex);
  if (insertCommand.affectedIds.length === 0 || childIds.length === 0) {
    return insertCommand;
  }

  const childPatches = childIds.map((id, index) => ({
    id,
    parent_block_id: createdBlock.id,
    order_index: index,
  }));
  const childPatchById = new Map(childPatches.map((patch) => [patch.id, patch]));
  const nextBlocks = insertCommand.nextBlocks.map((block) => {
    const patch = childPatchById.get(block.id);
    return patch
      ? { ...block, parent_block_id: patch.parent_block_id, order_index: patch.order_index }
      : block;
  });

  return {
    ...insertCommand,
    nextBlocks,
    affectedIds: [...new Set([
      ...insertCommand.affectedIds,
      createdBlock.id,
      ...childIds,
    ])],
    fieldPatches: [
      ...insertCommand.fieldPatches,
      ...childPatches,
    ],
  };
}

export function buildMergeWithPreviousBlockCommand(
  blocks: NoteBlock[],
  blockId: string,
): (NoteBlockCommandResult & {
  focusBlockId: string;
  caretOffset: number;
  splitHint?: { blockType: NoteBlock['type']; offset: number };
}) | null {
  const plan = planMergeWithPreviousBlock(blocks, blockId);
  if (!plan) return null;
  const sourceBlock = blocks.find((block) => block.id === blockId);
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
    ...(sourceBlock?.type === 'bulletList' || sourceBlock?.type === 'numberedList'
      ? { splitHint: { blockType: sourceBlock.type, offset: plan.caretOffset } }
      : {}),
  };
}
