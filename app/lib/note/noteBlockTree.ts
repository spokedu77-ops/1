export type NoteBlockLike = {
  id: string;
  parent_block_id?: string | null;
  order_index: number;
};

export function buildChildrenByParentBlock<T extends NoteBlockLike>(blocks: T[]) {
  const map = new Map<string, T[]>();
  for (const block of blocks) {
    if (!block.parent_block_id) continue;
    const list = map.get(block.parent_block_id) ?? [];
    list.push(block);
    map.set(block.parent_block_id, list);
  }
  for (const [key, list] of map.entries()) {
    map.set(key, [...list].sort((a, b) => a.order_index - b.order_index));
  }
  return map;
}

export function sortRootBlocks<T extends NoteBlockLike>(blocks: T[]) {
  return blocks
    .filter((block) => !block.parent_block_id)
    .sort((a, b) => a.order_index - b.order_index);
}

/** 토글 안에서 인라인(테두리 없음)으로 둘 타입 */
export const TOGGLE_INLINE_CHILD_TYPES = new Set(['text', 'todo', 'toggle']);

type BlockWithMeta = NoteBlockLike & {
  type: string;
  content?: Record<string, unknown> | null;
};

export function shouldStayToggleInlineChild(
  block: BlockWithMeta,
  parent: BlockWithMeta | undefined,
): boolean {
  if (!parent || parent.type !== 'toggle') return false;
  if (block.content?.migratedFromToggleBody === true) return false;
  if (block.content?.placedInToggle === true) return true;
  if (block.content?.createdInsideToggle === true) {
    return TOGGLE_INLINE_CHILD_TYPES.has(block.type);
  }
  // 기존 데이터: 토글 안 text·todo·토글은 인라인 유지
  return TOGGLE_INLINE_CHILD_TYPES.has(block.type);
}

export type PromoteBlockToRootPatch = {
  id: string;
  parent_block_id: null;
  order_index: number;
};

/** 토글·텍스트 블록 안에 잘못 들어간 기존 블록을 문서 루트 블록으로 올린다. */
export function planPromoteDocumentBlocksToRoot<T extends BlockWithMeta>(
  blocks: T[],
): { blocks: T[]; patches: PromoteBlockToRootPatch[] } {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const rootBlocks = sortRootBlocks(blocks);
  let nextRootOrder =
    rootBlocks.length > 0 ? Math.max(...rootBlocks.map((block) => block.order_index)) + 1 : 0;
  const patches: PromoteBlockToRootPatch[] = [];

  const nextBlocks = blocks.map((block) => {
    const parentId = block.parent_block_id ?? null;
    if (!parentId) return block;

    const parent = byId.get(parentId);
    if (shouldStayToggleInlineChild(block, parent)) return block;

    const patch: PromoteBlockToRootPatch = {
      id: block.id,
      parent_block_id: null,
      order_index: nextRootOrder,
    };
    patches.push(patch);
    nextRootOrder += 1;
    return { ...block, parent_block_id: null, order_index: patch.order_index };
  });

  return { blocks: nextBlocks, patches };
}

export function collectDescendantBlockIds(blockId: string, blocks: Array<{ id: string; parent_block_id?: string | null }>) {
  const ids = new Set<string>();
  const walk = (parentId: string) => {
    for (const block of blocks) {
      if (block.parent_block_id !== parentId || ids.has(block.id)) continue;
      ids.add(block.id);
      walk(block.id);
    }
  };
  walk(blockId);
  return ids;
}

export function filterSiblingBlocks<T extends NoteBlockLike>(blocks: T[], block: T) {
  const parentId = block.parent_block_id ?? null;
  return getBlocksInParent(blocks, parentId);
}

export function getBlocksInParent<T extends NoteBlockLike>(blocks: T[], parentId: string | null): T[] {
  return blocks
    .filter((item) => (item.parent_block_id ?? null) === parentId)
    .sort((a, b) => a.order_index - b.order_index);
}

export type BlockDropPlan = {
  targetParentId: string | null;
  targetSiblings: BlockWithMeta[];
  placedInToggle: boolean;
};

/** 드래그한 블록을 다른 부모(토글 안·루트·하위 토글)로 옮길 위치를 계산한다. */
export function planBlockDrop<T extends BlockWithMeta>(
  blocks: T[],
  movingId: string,
  overId: string,
): BlockDropPlan | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const moving = byId.get(movingId);
  const over = byId.get(overId);
  if (!moving || !over || moving.id === over.id) return null;

  const descendantIds = collectDescendantBlockIds(moving.id, blocks);
  if (descendantIds.has(over.id)) return null;

  const movingParentId = moving.parent_block_id ?? null;
  const overParentId = over.parent_block_id ?? null;

  const withoutMoving = (parentId: string | null) =>
    getBlocksInParent(blocks, parentId).filter((block) => block.id !== moving.id);

  const finish = (targetParentId: string | null, ordered: T[]): BlockDropPlan => {
    const parentBlock = targetParentId ? byId.get(targetParentId) : undefined;
    return {
      targetParentId,
      targetSiblings: ordered.map((block, index) => ({ ...block, order_index: index })),
      placedInToggle: parentBlock?.type === 'toggle',
    };
  };

  // 토글 위에 드롭 → 토글 안(맨 아래)으로 이동
  if (over.type === 'toggle') {
    const children = withoutMoving(over.id);
    return finish(over.id, [...children, moving]);
  }

  // 같은 부모 → 순서만 변경
  if (movingParentId === overParentId) {
    const siblings = getBlocksInParent(blocks, movingParentId);
    const oldIndex = siblings.findIndex((block) => block.id === moving.id);
    const newIndex = siblings.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return null;
    const reordered = arrayMove(siblings, oldIndex, newIndex);
    return finish(movingParentId, reordered);
  }

  // 다른 부모 → over 블록 앞에 삽입
  const targetSiblings = withoutMoving(overParentId);
  const insertAt = targetSiblings.findIndex((block) => block.id === over.id);
  const at = insertAt >= 0 ? insertAt : targetSiblings.length;
  const nextSiblings = [
    ...targetSiblings.slice(0, at),
    moving,
    ...targetSiblings.slice(at),
  ];
  return finish(overParentId, nextSiblings);
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function buildReparentContentPatch(
  content: Record<string, unknown> | null | undefined,
  blockType: string,
  placedInToggle: boolean,
): Record<string, unknown> | undefined {
  const base = (content ?? {}) as Record<string, unknown>;
  if (placedInToggle) {
    return {
      ...base,
      placedInToggle: true,
      ...(TOGGLE_INLINE_CHILD_TYPES.has(blockType) ? { createdInsideToggle: true } : {}),
    };
  }
  if (!base.placedInToggle && !base.createdInsideToggle) return undefined;
  const next = { ...base };
  delete next.placedInToggle;
  if (!TOGGLE_INLINE_CHILD_TYPES.has(blockType)) {
    delete next.createdInsideToggle;
  }
  return next;
}
