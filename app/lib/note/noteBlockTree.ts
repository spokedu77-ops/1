export type NoteBlockLike = {
  id: string;
  parent_block_id?: string | null;
  order_index: number;
};

type BlockWithMeta = NoteBlockLike & {
  type: string;
  content?: Record<string, unknown> | null;
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

/** 동일 id가 배열에 두 번 들어가면 React key 경고·UI 중복 — 첫 등장 순서 유지, 최신 객체 우선 */
export function dedupeNoteBlocksById<T extends NoteBlockLike>(blocks: T[]): T[] {
  const latestById = new Map<string, T>();
  for (const block of blocks) {
    latestById.set(block.id, block);
  }
  const seen = new Set<string>();
  const result: T[] = [];
  for (const block of blocks) {
    if (seen.has(block.id)) continue;
    seen.add(block.id);
    result.push(latestById.get(block.id) ?? block);
  }
  return result;
}

/** 에디터 DOM 순서(부모 직후 자식 DFS)로 블록 id 나열 — dnd SortableContext용 */
export function flattenVisualBlockIds<T extends NoteBlockLike>(blocks: T[]): string[] {
  return flattenVisualBlockIdsWithOptions(blocks as unknown as BlockWithMeta[]);
}

/** 접힌 토글 자식 생략 등 옵션을 적용한 시각적 블록 순서 */
export function flattenVisualBlockIdsWithOptions<T extends BlockWithMeta>(
  blocks: T[],
  options?: { skipChildrenOfCollapsedToggles?: boolean },
): string[] {
  const result: string[] = [];
  const walk = (parentId: string | null) => {
    for (const block of getBlocksInParent(blocks, parentId)) {
      result.push(block.id);
      const skipChildren =
        options?.skipChildrenOfCollapsedToggles
        && block.type === 'toggle'
        && !!block.content?.collapsed;
      if (!skipChildren) walk(block.id);
    }
  };
  walk(null);
  return result;
}

/** 위/아래 화살표 이동 대상 — 중첩 목록·토글 자식 포함 시각적 이전/다음 블록 */
export function resolveVisualNavigateTarget<T extends BlockWithMeta>(
  blocks: T[],
  blockId: string,
  direction: 'previous' | 'next',
): T | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const visualIds = flattenVisualBlockIdsWithOptions(blocks, {
    skipChildrenOfCollapsedToggles: true,
  });
  const idx = visualIds.indexOf(blockId);
  if (idx < 0) return null;
  const targetId = direction === 'previous' ? visualIds[idx - 1] : visualIds[idx + 1];
  if (!targetId) return null;
  return byId.get(targetId) ?? null;
}

/** 다중 선택 드래그 — 조상도 선택된 자식은 루트로 세지 않음 */
export function topLevelSelectedDragIds<T extends NoteBlockLike>(
  selectedIds: string[],
  blocks: T[],
): string[] {
  const selectedSet = new Set(selectedIds);
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return selectedIds.filter((id) => {
    let parentId = byId.get(id)?.parent_block_id ?? null;
    while (parentId) {
      if (selectedSet.has(parentId)) return false;
      parentId = byId.get(parentId)?.parent_block_id ?? null;
    }
    return true;
  });
}

/** Shift+클릭 등 — 시각적(DFS) 순서로 from~to 사이 블록 id */
export function getBlockRangeIdsInVisualOrder<T extends NoteBlockLike>(
  blocks: T[],
  fromId: string,
  toId: string,
): string[] {
  const visualIds = flattenVisualBlockIds(blocks);
  const fromIdx = visualIds.indexOf(fromId);
  const toIdx = visualIds.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return toId ? [toId] : fromId ? [fromId] : [];
  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  return visualIds.slice(lo, hi + 1);
}

/** 토글 안에서 인라인(테두리 없음)으로 둘 타입 */
export const TOGGLE_INLINE_CHILD_TYPES = new Set(['text', 'todo', 'toggle', 'page']);

/** Tab으로 토글 안에 넣을 수 있는 타입 (divider·이미지·영상 등 제외) */
export const TAB_INTO_TOGGLE_BLOCKED_TYPES = new Set(['divider', 'image', 'video']);

/** Tab으로 하위 항목을 받을 수 있는 목록 블록 타입 */
export const LIST_CONTAINER_TYPES = new Set(['bulletList', 'numberedList']);

/** Backspace 병합 대상 타입 */
export const MERGEABLE_BLOCK_TYPES = new Set([
  'text', 'heading', 'heading2', 'heading3', 'todo', 'callout', 'bulletList', 'numberedList',
]);

export function shouldStayToggleInlineChild(
  block: BlockWithMeta,
  parent: BlockWithMeta | undefined,
): boolean {
  if (!parent) return false;
  // 글머리·번호 목록 안의 블록은 중첩 목록 아이템 — 루트로 승격하지 않음
  if (LIST_CONTAINER_TYPES.has(parent.type)) return true;
  if (parent.type !== 'toggle') return false;
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

export type BlockDropPlan<T extends BlockWithMeta = BlockWithMeta> = {
  targetParentId: string | null;
  targetSiblings: T[];
  placedInToggle: boolean;
};

export type BlockDropPosition = 'before' | 'after' | 'inside';

/** 드래그한 블록을 before/after/inside(토글) 위치로 옮길 계획을 계산한다. */
export function planBlockDropAt<T extends BlockWithMeta>(
  blocks: T[],
  movingId: string,
  targetBlockId: string,
  position: BlockDropPosition,
): BlockDropPlan<T> | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const moving = byId.get(movingId);
  const target = byId.get(targetBlockId);
  if (!moving || !target || moving.id === target.id) return null;

  const descendantIds = collectDescendantBlockIds(moving.id, blocks);
  if (descendantIds.has(target.id)) return null;

  const withoutMoving = (parentId: string | null) =>
    getBlocksInParent(blocks, parentId).filter((block) => block.id !== moving.id);

  const finish = (targetParentId: string | null, ordered: T[]): BlockDropPlan<T> => {
    const parentBlock = targetParentId ? byId.get(targetParentId) : undefined;
    return {
      targetParentId,
      targetSiblings: ordered.map((block, index) => ({ ...block, order_index: index })),
      placedInToggle: parentBlock?.type === 'toggle',
    };
  };

  if (position === 'inside') {
    if (target.type !== 'toggle') return null;
    const children = withoutMoving(target.id);
    return finish(target.id, [...children, moving]);
  }

  const parentId = target.parent_block_id ?? null;
  const siblings = withoutMoving(parentId);
  let insertAt = siblings.findIndex((block) => block.id === target.id);
  if (insertAt < 0) return null;
  if (position === 'after') insertAt += 1;
  const nextSiblings = [
    ...siblings.slice(0, insertAt),
    moving,
    ...siblings.slice(insertAt),
  ];
  return finish(parentId, nextSiblings);
}

/** 드래그한 블록을 다른 부모(토글 안·루트·하위 토글)로 옮길 위치를 계산한다. */
export function planBlockDrop<T extends BlockWithMeta>(
  blocks: T[],
  movingId: string,
  overId: string,
): BlockDropPlan<T> | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const over = byId.get(overId);
  if (!over) return null;
  if (over.type === 'toggle') {
    return planBlockDropAt(blocks, movingId, overId, 'inside');
  }
  return planBlockDropAt(blocks, movingId, overId, 'before');
}

/** Tab/Shift+Tab으로 블록을 한 단계 안쪽(이전 형제 토글 안) 또는 바깥(부모 다음)으로 옮길 계획. */
export function planBlockTabIndent<T extends BlockWithMeta>(
  blocks: T[],
  blockId: string,
  direction: 'in' | 'out',
): BlockDropPlan<T> | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const moving = byId.get(blockId);
  if (!moving) return null;

  const movingParentId = moving.parent_block_id ?? null;

  if (direction === 'in') {
    const siblings = getBlocksInParent(blocks, movingParentId);
    const idx = siblings.findIndex((block) => block.id === moving.id);
    if (idx <= 0) return null;

    const prev = siblings[idx - 1];
    if (TAB_INTO_TOGGLE_BLOCKED_TYPES.has(moving.type)) return null;

    const descendantIds = collectDescendantBlockIds(moving.id, blocks);
    if (descendantIds.has(prev.id)) return null;

    const nestIntoToggle = prev.type === 'toggle';
    const nestIntoList = LIST_CONTAINER_TYPES.has(prev.type) && moving.type === prev.type;
    if (!nestIntoToggle && !nestIntoList) return null;

    const children = getBlocksInParent(blocks, prev.id).filter((block) => block.id !== moving.id);
    const targetSiblings = [...children, moving].map((block, index) => ({ ...block, order_index: index }));
    return {
      targetParentId: prev.id,
      targetSiblings,
      placedInToggle: nestIntoToggle,
    };
  }

  if (!movingParentId) return null;

  const parent = byId.get(movingParentId);
  if (!parent) return null;

  const grandParentId = parent.parent_block_id ?? null;
  const cousins = getBlocksInParent(blocks, grandParentId).filter((block) => block.id !== moving.id);
  const parentIdx = cousins.findIndex((block) => block.id === parent.id);
  if (parentIdx < 0) return null;

  const insertAt = parentIdx + 1;
  const targetSiblings = [
    ...cousins.slice(0, insertAt),
    moving,
    ...cousins.slice(insertAt),
  ].map((block, index) => ({ ...block, order_index: index }));

  const grandParent = grandParentId ? byId.get(grandParentId) : undefined;
  return {
    targetParentId: grandParentId,
    targetSiblings,
    placedInToggle: grandParent?.type === 'toggle',
  };
}

/** 글머리 목록 마커 단계 — 목록 컨테이너(bullet/numbered) 조상만 센다. 토글 안 첫 항목은 0(•). */
export function bulletListNestLevelAmongContainers<T extends BlockWithMeta>(
  block: T,
  blocks: T[],
): number {
  let level = 0;
  let parentId = block.parent_block_id ?? null;
  while (parentId) {
    const parent = blocks.find((item) => item.id === parentId);
    if (!parent) break;
    if (LIST_CONTAINER_TYPES.has(parent.type)) {
      level += 1;
    }
    parentId = parent.parent_block_id ?? null;
  }
  return Math.max(0, Math.min(2, level));
}

/** 같은 부모 아래 번호 목록 형제 중 표시 순번 (1부터) */
export function numberedListIndexAmongSiblings<T extends BlockWithMeta>(
  block: T,
  siblings: T[],
): number {
  const ordered = [...siblings]
    .filter((item) => item.type === 'numberedList')
    .sort((a, b) => a.order_index - b.order_index);
  const idx = ordered.findIndex((item) => item.id === block.id);
  return idx >= 0 ? idx + 1 : 1;
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

/** 드래그 drop 계획을 메모리 블록 배열에 적용 (단일 블록) */
export function applyBlockDropPlanInMemory<T extends BlockWithMeta>(
  blocks: T[],
  movingId: string,
  plan: BlockDropPlan<T>,
): T[] {
  const moving = blocks.find((block) => block.id === movingId);
  if (!moving) return blocks;

  const targetMap = new Map(plan.targetSiblings.map((item) => [item.id, item]));
  const oldParentId = moving.parent_block_id ?? null;
  const parentChanged = oldParentId !== plan.targetParentId;
  const oldSiblings = parentChanged
    ? getBlocksInParent(blocks, oldParentId)
      .filter((item) => item.id !== movingId)
      .map((item, index) => ({ ...item, order_index: index }))
    : [];
  const oldMap = new Map(oldSiblings.map((item) => [item.id, item]));
  const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);

  return blocks.map((item) => {
    if (item.id === movingId) {
      return {
        ...item,
        parent_block_id: plan.targetParentId,
        order_index: plan.targetSiblings.findIndex((sibling) => sibling.id === movingId),
        content: contentPatch ?? item.content,
      };
    }
    if (targetMap.has(item.id)) return targetMap.get(item.id)!;
    if (oldMap.has(item.id)) return oldMap.get(item.id)!;
    return item;
  });
}

export type PromoteChildrenOnDeletePatch = {
  id: string;
  parent_block_id: string | null;
  order_index: number;
  content?: Record<string, unknown>;
};

/** 블록 삭제 시 직계 자식을 삭제 위치(부모)로 승격한다. 자손은 유지. */
export function planPromoteChildrenOnDelete<T extends BlockWithMeta>(
  blocks: T[],
  blockId: string,
): { deletedId: string; patches: PromoteChildrenOnDeletePatch[] } | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const deleted = byId.get(blockId);
  if (!deleted) return null;

  const parentId = deleted.parent_block_id ?? null;
  const directChildren = getBlocksInParent(blocks, blockId);
  const siblings = getBlocksInParent(blocks, parentId);
  const deletedIdx = siblings.findIndex((block) => block.id === blockId);
  if (deletedIdx < 0) return null;

  const newParent = parentId ? byId.get(parentId) : undefined;
  const placedInToggle = newParent?.type === 'toggle';

  const promotedChildren = directChildren.map((child) => {
    const contentPatch = buildReparentContentPatch(child.content, child.type, placedInToggle);
    return {
      ...child,
      parent_block_id: parentId,
      ...(contentPatch ? { content: contentPatch } : {}),
    };
  });

  const siblingsWithoutDeleted = siblings.filter((block) => block.id !== blockId);
  const reordered = [
    ...siblingsWithoutDeleted.slice(0, deletedIdx),
    ...promotedChildren,
    ...siblingsWithoutDeleted.slice(deletedIdx),
  ].map((block, index) => ({ ...block, order_index: index }));

  const patches: PromoteChildrenOnDeletePatch[] = reordered.map((block) => ({
    id: block.id,
    parent_block_id: block.parent_block_id ?? null,
    order_index: block.order_index,
    ...(directChildren.some((child) => child.id === block.id) && block.content
      ? { content: block.content as Record<string, unknown> }
      : {}),
  }));

  return { deletedId: blockId, patches };
}

export function getBlockAncestorDepth<T extends NoteBlockLike>(block: T, blocks: T[]): number {
  let depth = 0;
  let parentId = block.parent_block_id ?? null;
  while (parentId) {
    depth += 1;
    parentId = blocks.find((item) => item.id === parentId)?.parent_block_id ?? null;
  }
  return depth;
}

/** 여러 블록을 한 번에 삭제할 때 로컬 상태·승격 PATCH를 계산한다. */
export function planBatchDeleteBlocks<T extends BlockWithMeta>(
  blocks: T[],
  deleteIds: Iterable<string>,
): { nextBlocks: T[]; patches: PromoteChildrenOnDeletePatch[]; deletedIds: string[] } | null {
  const deleteSet = new Set(deleteIds);
  if (deleteSet.size === 0) return null;

  const patchById = new Map<string, PromoteChildrenOnDeletePatch>();
  let working = blocks;
  const deletedIds: string[] = [];

  const targets = working
    .filter((block) => deleteSet.has(block.id))
    .sort((a, b) => {
      const depthDiff = getBlockAncestorDepth(b, working) - getBlockAncestorDepth(a, working);
      return depthDiff !== 0 ? depthDiff : b.order_index - a.order_index;
    });

  for (const target of targets) {
    if (!working.some((block) => block.id === target.id)) continue;

    const plan = planPromoteChildrenOnDelete(working, target.id);
    deletedIds.push(target.id);

    if (!plan) {
      working = working.filter((block) => block.id !== target.id);
      continue;
    }

    const patchesToApply = plan.patches.filter(
      (patch) => patch.id !== target.id && !deleteSet.has(patch.id),
    );
    for (const patch of patchesToApply) {
      patchById.set(patch.id, patch);
    }

    const patchMap = new Map(patchesToApply.map((patch) => [patch.id, patch]));
    working = working
      .filter((block) => block.id !== target.id)
      .map((block) => {
        const patch = patchMap.get(block.id);
        if (!patch) return block;
        return {
          ...block,
          parent_block_id: patch.parent_block_id,
          order_index: patch.order_index,
          ...(patch.content ? { content: patch.content } : {}),
        };
      });
  }

  return {
    nextBlocks: working,
    patches: [...patchById.values()],
    deletedIds,
  };
}

/** 루트 블록 여러 개를 한 덩어리로 before/after 이동 */
export function planMoveRootBlockGroup<T extends BlockWithMeta>(
  blocks: T[],
  movingIds: Iterable<string>,
  targetBlockId: string,
  position: BlockDropPosition,
): T[] | null {
  if (position === 'inside') return null;

  const moveSet = new Set(movingIds);
  const roots = sortRootBlocks(blocks);
  const moving = roots.filter((block) => moveSet.has(block.id));
  if (moving.length === 0) return null;

  const remaining = roots.filter((block) => !moveSet.has(block.id));
  const targetIdx = remaining.findIndex((block) => block.id === targetBlockId);
  let insertIdx = remaining.length;
  if (targetIdx >= 0) {
    insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
  }

  return [
    ...remaining.slice(0, insertIdx),
    ...moving,
    ...remaining.slice(insertIdx),
  ].map((block, index) => ({ ...block, order_index: index, parent_block_id: null }));
}

export function getBlockMergeText(block: BlockWithMeta): string {
  const text = block.content?.text;
  return typeof text === 'string' ? text : '';
}

/** 커서가 블록 맨 앞일 때 이전 블록과 텍스트 병합 계획 */
export function planMergeWithPreviousBlock<T extends BlockWithMeta>(
  blocks: T[],
  blockId: string,
): { previousId: string; deleteId: string; mergedContent: Record<string, unknown>; caretOffset: number } | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const current = byId.get(blockId);
  if (!current || !MERGEABLE_BLOCK_TYPES.has(current.type)) return null;

  const parentId = current.parent_block_id ?? null;
  const siblings = getBlocksInParent(blocks, parentId);
  const idx = siblings.findIndex((block) => block.id === blockId);
  if (idx <= 0) return null;

  const previous = siblings[idx - 1];
  if (!MERGEABLE_BLOCK_TYPES.has(previous.type)) return null;

  const prevText = getBlockMergeText(previous);
  const currText = getBlockMergeText(current);
  const mergedContent: Record<string, unknown> = {
    ...(previous.content ?? {}),
    text: prevText + currText,
  };
  delete mergedContent.html;
  delete mergedContent.legacyText;

  return {
    previousId: previous.id,
    deleteId: current.id,
    mergedContent,
    caretOffset: prevText.length,
  };
}
