import { collectDeletableBlockForestIds } from '../_lib/noteBlockCommands';
import type { NoteBlockFieldPatch } from '../_lib/noteBlocksApi';
import type { NoteBlock } from '../_lib/types';

export type NoteHistoryTransactionPlan = {
  scopeIds: Set<string>;
  targetIds: Set<string>;
  currentBlocks: NoteBlock[];
  deleteIds: string[];
  restoreRoots: NoteBlock[];
  fieldPatches: NoteBlockFieldPatch[];
};

export type NoteHistoryPersistStep =
  | { type: 'softDelete'; ids: string[]; blocks: NoteBlock[] }
  | { type: 'restoreRoots'; roots: NoteBlock[] }
  | { type: 'patchFields'; patches: NoteBlockFieldPatch[] };

export function buildHistoryPersistSteps(
  plan: Pick<NoteHistoryTransactionPlan, 'currentBlocks' | 'deleteIds' | 'restoreRoots' | 'fieldPatches'>,
): NoteHistoryPersistStep[] {
  const steps: NoteHistoryPersistStep[] = [];
  if (plan.deleteIds.length > 0) {
    const blockById = new Map(plan.currentBlocks.map((block) => [block.id, block]));
    steps.push({
      type: 'softDelete',
      ids: plan.deleteIds,
      blocks: plan.deleteIds
        .map((id) => blockById.get(id))
        .filter((block): block is NoteBlock => Boolean(block)),
    });
  }
  if (plan.restoreRoots.length > 0) {
    steps.push({ type: 'restoreRoots', roots: plan.restoreRoots });
  }
  if (plan.fieldPatches.length > 0) {
    steps.push({ type: 'patchFields', patches: plan.fieldPatches });
  }
  return steps;
}

export function buildHistoryTransactionNextBlocks(input: {
  current: NoteBlock[];
  target: NoteBlock[];
  plan: Pick<NoteHistoryTransactionPlan, 'scopeIds' | 'targetIds'>;
  restoredById?: ReadonlyMap<string, NoteBlock>;
}): NoteBlock[] {
  const restoredById = input.restoredById ?? new Map<string, NoteBlock>();
  const targetMap = new Map(input.target.map((block) => {
    const restored = restoredById.get(block.id);
    return [block.id, restored ? { ...block, version: restored.version } : block];
  }));
  const next = input.current
    .filter((block) => !input.plan.scopeIds.has(block.id) || input.plan.targetIds.has(block.id))
    .map((block) => targetMap.get(block.id) ?? block);
  for (const snapshot of targetMap.values()) {
    if (!next.some((block) => block.id === snapshot.id)) next.push(snapshot);
  }
  return next;
}

export function buildRestoreBlocksFieldPatches(
  snapshots: NoteBlock[],
): NoteBlockFieldPatch[] {
  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    document_id: snapshot.document_id,
    type: snapshot.type,
    content: snapshot.content,
    parent_block_id: snapshot.parent_block_id ?? null,
    order_index: snapshot.order_index,
  }));
}

export function buildHistoryTransactionPlan(
  current: NoteBlock[],
  target: NoteBlock[],
): NoteHistoryTransactionPlan {
  const scopeIds = new Set([
    ...current.map((block) => block.id),
    ...target.map((block) => block.id),
  ]);
  const targetIds = new Set(target.map((block) => block.id));
  const deleteRootCandidates = current
    .filter((block) => scopeIds.has(block.id) && !targetIds.has(block.id))
    .map((block) => block.id);
  const deleteIds = collectDeletableBlockForestIds(deleteRootCandidates, current)
    .filter((id) => scopeIds.has(id));
  const currentIds = new Set(current.map((block) => block.id));
  const missingIds = new Set(
    target
      .filter((block) => !currentIds.has(block.id))
      .map((block) => block.id),
  );
  const restoreRoots = target.filter((block) =>
    missingIds.has(block.id)
    && (!block.parent_block_id || !missingIds.has(block.parent_block_id)),
  );

  return {
    scopeIds,
    targetIds,
    currentBlocks: current,
    deleteIds,
    restoreRoots,
    fieldPatches: target.map((snapshot) => ({
      id: snapshot.id,
      document_id: snapshot.document_id,
      type: snapshot.type,
      content: snapshot.content,
      parent_block_id: snapshot.parent_block_id ?? null,
      order_index: snapshot.order_index,
    })),
  };
}
