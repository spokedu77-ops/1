import { buildChildrenByParentBlock, dedupeNoteBlocksById, sortRootBlocks } from './noteBlockTree';
import { canPlaceBlockInParent } from './noteBlockPolicy';

export type SanitizableNoteBlock = {
  id: string;
  type: string;
  parent_block_id?: string | null;
  order_index: number;
  content?: Record<string, unknown> | null;
  /** 있으면 document별로 분리 sanitize — transfer projection이 root sibling으로 섞이지 않음 */
  document_id?: string | null;
};

function hasDuplicateOrdersInGroup<T extends SanitizableNoteBlock>(siblings: T[]): boolean {
  const seen = new Set<number>();
  for (const block of siblings) {
    if (seen.has(block.order_index)) return true;
    seen.add(block.order_index);
  }
  return false;
}

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
  // 허용 조상 없음 → root로 승격(수리). root도 불가면 그래도 null(후속 guard/RPC가 최종 판단).
  return null;
}

export function sanitizeNoteBlockTree<T extends SanitizableNoteBlock>(blocks: T[]): T[] {
  const deduped = dedupeNoteBlocksById(blocks);
  const hasDocumentBoundary = deduped.some(
    (block) => typeof block.document_id === 'string' && block.document_id.length > 0,
  );
  if (!hasDocumentBoundary) {
    return sanitizeNoteBlockTreeWithinDocument(deduped);
  }

  const byDocument = new Map<string, T[]>();
  for (const block of deduped) {
    const key = block.document_id ?? '__none__';
    const group = byDocument.get(key) ?? [];
    group.push(block);
    byDocument.set(key, group);
  }
  const ordered: T[] = [];
  for (const group of byDocument.values()) {
    ordered.push(...sanitizeNoteBlockTreeWithinDocument(group));
  }
  return ordered;
}

function sanitizeNoteBlockTreeWithinDocument<T extends SanitizableNoteBlock>(blocks: T[]): T[] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const reparented = blocks.map((block) => {
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
    // Integrity: unique order면 absolute index를 다시 쓰지 않음 (상대 순서 유지, 침묵 compaction 금지)
    const compact = hasDuplicateOrdersInGroup(siblings);
    siblings.forEach((block, index) => {
      const normalized = compact && block.order_index !== index
        ? { ...block, order_index: index }
        : block;
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
