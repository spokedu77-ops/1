import { buildChildrenByParentBlock, dedupeNoteBlocksById, sortRootBlocks } from './noteBlockTree';
import { canPlaceBlockInParent } from './noteBlockPolicy';

export type SanitizableNoteBlock = {
  id: string;
  type: string;
  parent_block_id?: string | null;
  order_index: number;
  content?: Record<string, unknown> | null;
};

function hasAncestor<T extends SanitizableNoteBlock>(
  blocksById: Map<string, T>,
  blockId: string,
  ancestorId: string,
): boolean {
  let parentId = blocksById.get(blockId)?.parent_block_id ?? null;
  const seen = new Set<string>();
  while (parentId) {
    if (parentId === ancestorId) return true;
    if (seen.has(parentId)) return false;
    seen.add(parentId);
    parentId = blocksById.get(parentId)?.parent_block_id ?? null;
  }
  return false;
}

function nearestAllowedParentId<T extends SanitizableNoteBlock>(
  block: T,
  requestedParentId: string | null,
  blocksById: Map<string, T>,
): string | null {
  let parentId = requestedParentId;
  const seen = new Set<string>();
  while (parentId) {
    if (parentId === block.id || seen.has(parentId)) return null;
    seen.add(parentId);
    const parent = blocksById.get(parentId);
    if (!parent) return null;
    if (hasAncestor(blocksById, parent.id, block.id)) return null;
    if (canPlaceBlockInParent(block, parent)) return parent.id;
    parentId = parent.parent_block_id ?? null;
  }
  return canPlaceBlockInParent(block, null) ? null : null;
}

export function sanitizeNoteBlockTree<T extends SanitizableNoteBlock>(blocks: T[]): T[] {
  const deduped = dedupeNoteBlocksById(blocks);
  const byId = new Map(deduped.map((block) => [block.id, block]));
  const reparented = deduped.map((block) => {
    const requestedParentId = block.parent_block_id ?? null;
    const parent = requestedParentId ? byId.get(requestedParentId) : null;
    const validParent =
      !requestedParentId
        ? canPlaceBlockInParent(block, null)
        : !!parent
          && !hasAncestor(byId, parent.id, block.id)
          && canPlaceBlockInParent(block, parent);
    if (validParent) return { ...block, parent_block_id: requestedParentId };
    return {
      ...block,
      parent_block_id: nearestAllowedParentId(block, requestedParentId, byId),
    };
  });

  const childrenByParent = buildChildrenByParentBlock(reparented);
  const ordered: T[] = [];
  const pushSiblings = (parentId: string | null) => {
    const siblings = parentId === null ? sortRootBlocks(reparented) : (childrenByParent.get(parentId) ?? []);
    siblings.forEach((block, index) => {
      const normalized = block.order_index === index ? block : { ...block, order_index: index };
      ordered.push(normalized);
      pushSiblings(block.id);
    });
  };
  pushSiblings(null);

  const emitted = new Set(ordered.map((block) => block.id));
  const missing = reparented.filter((block) => !emitted.has(block.id));
  if (missing.length === 0) return ordered;

  const rootCount = ordered.filter((block) => !block.parent_block_id).length;
  return [
    ...ordered,
    ...missing.map((block, index) => ({
      ...block,
      parent_block_id: null,
      order_index: rootCount + index,
    })),
  ];
}
