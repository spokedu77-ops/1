import { collectDeletableBlockForestIds } from '../_lib/noteBlockCommands';
import type { NoteBlockFieldPatch } from '../_lib/noteBlocksApi';
import type { NoteBlock } from '../_lib/types';

export type NoteHistoryTransactionPlan = {
  scopeIds: Set<string>;
  targetIds: Set<string>;
  deleteIds: string[];
  restoreRoots: NoteBlock[];
  fieldPatches: NoteBlockFieldPatch[];
};

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
