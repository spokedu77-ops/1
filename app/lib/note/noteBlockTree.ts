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

/** Tab으로 하위 항목을 받을 수 있는 목록 블록 타입 */
export const LIST_CONTAINER_TYPES = new Set(['bulletList', 'numberedList']);

/** Backspace 병합 대상 타입 */
export const MERGEABLE_BLOCK_TYPES = new Set([
  'text', 'heading', 'heading2', 'heading3', 'todo', 'callout', 'bulletList', 'numberedList',
]);

export type CanonicalTreePatch = {
  id: string;
  parent_block_id: string | null;
  order_index: number;
  content?: Record<string, unknown>;
};

/**
 * legacy content.depth를 실제 parent_block_id 트리로 한 번만 변환한다.
 * 이미 parent_block_id가 있는 블록은 그 관계를 보존하고 depth 필드만 제거한다.
 */
export function planCanonicalizeBlockTree<T extends BlockWithMeta>(
  blocks: T[],
): { blocks: T[]; patches: CanonicalTreePatch[] } {
  const roots = blocks
    .filter((block) => !block.parent_block_id)
    .map((block, sourceIndex) => ({ block, sourceIndex }))
    .sort((left, right) =>
      left.block.order_index - right.block.order_index
      || left.sourceIndex - right.sourceIndex);
  const lastAtDepth: T[] = [];
  const nextOrderByParent = new Map<string | null, number>();

  for (const block of blocks) {
    if (!block.parent_block_id) continue;
    const current = nextOrderByParent.get(block.parent_block_id) ?? 0;
    nextOrderByParent.set(
      block.parent_block_id,
      Math.max(current, block.order_index + 1),
    );
  }

  const planned = new Map<string, { parentId: string | null; order: number }>();
  for (const { block } of roots) {
    const rawDepth = Number(block.content?.depth ?? 0);
    const requestedDepth = Number.isFinite(rawDepth)
      ? Math.max(0, Math.min(20, Math.round(rawDepth)))
      : 0;
    const parent = requestedDepth > 0 ? lastAtDepth[requestedDepth - 1] : undefined;
    const parentId = parent?.id ?? null;
    const order = nextOrderByParent.get(parentId) ?? 0;
    nextOrderByParent.set(parentId, order + 1);
    planned.set(block.id, { parentId, order });

    const actualDepth = parent ? requestedDepth : 0;
    lastAtDepth[actualDepth] = block;
    lastAtDepth.length = actualDepth + 1;
  }

  const patches: CanonicalTreePatch[] = [];
  const nextBlocks = blocks.map((block) => {
    const plan = planned.get(block.id);
    const parentId = plan?.parentId ?? (block.parent_block_id ?? null);
    const orderIndex = plan?.order ?? block.order_index;
    const content = (block.content ?? null) as Record<string, unknown> | null;
    const hasLegacyDepth = !!content && Object.prototype.hasOwnProperty.call(content, 'depth');
    const nextContent = hasLegacyDepth ? { ...content } : content;
    if (nextContent) delete nextContent.depth;

    if (
      parentId === (block.parent_block_id ?? null)
      && orderIndex === block.order_index
      && !hasLegacyDepth
    ) {
      return block;
    }

    const patch: CanonicalTreePatch = {
      id: block.id,
      parent_block_id: parentId,
      order_index: orderIndex,
      ...(hasLegacyDepth && nextContent ? { content: nextContent } : {}),
    };
    patches.push(patch);
    return {
      ...block,
      parent_block_id: parentId,
      order_index: orderIndex,
      ...(hasLegacyDepth ? { content: nextContent } : {}),
    };
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

/** 선택한 블록과 모든 자손을 하나의 삭제 단위로 계산한다. */
export function collectBlockSubtreeIds(
  blockId: string,
  blocks: Array<{ id: string; parent_block_id?: string | null }>,
): string[] {
  if (!blocks.some((block) => block.id === blockId)) return [];
  return [blockId, ...collectDescendantBlockIds(blockId, blocks)];
}

/** 여러 선택에서 중복되는 자손을 제거하고 삭제할 전체 서브트리를 계산한다. */
export function collectBlockForestIds(
  blockIds: Iterable<string>,
  blocks: Array<{ id: string; parent_block_id?: string | null }>,
): string[] {
  const result = new Set<string>();
  for (const blockId of blockIds) {
    for (const id of collectBlockSubtreeIds(blockId, blocks)) {
      result.add(id);
    }
  }
  return [...result];
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

/** 드래그한 블록을 before/after/inside 위치로 옮길 계획을 계산한다. */
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

/** Tab/Shift+Tab으로 블록을 이전 형제의 자식 또는 부모 다음 형제로 옮긴다. */
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
    const descendantIds = collectDescendantBlockIds(moving.id, blocks);
    if (descendantIds.has(prev.id)) return null;

    const children = getBlocksInParent(blocks, prev.id).filter((block) => block.id !== moving.id);
    const targetSiblings = [...children, moving].map((block, index) => ({ ...block, order_index: index }));
    return {
      targetParentId: prev.id,
      targetSiblings,
      placedInToggle: prev.type === 'toggle',
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
  return Math.max(0, level);
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
      createdInsideToggle: true,
    };
  }
  if (!base.placedInToggle && !base.createdInsideToggle) return undefined;
  const next = { ...base };
  delete next.placedInToggle;
  delete next.createdInsideToggle;
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

/** 동일 부모 아래 형제 블록 그룹을 before/after 타깃 기준으로 재정렬 */
export function planMoveSiblingBlockGroup<T extends BlockWithMeta>(
  blocks: T[],
  movingIds: string[],
  targetBlockId: string,
  position: BlockDropPosition,
): T[] | null {
  if (position === 'inside' || movingIds.length === 0 || movingIds.includes(targetBlockId)) {
    return null;
  }

  const movingSet = new Set(movingIds);
  const movingBlocks = movingIds
    .map((id) => blocks.find((block) => block.id === id))
    .filter((block): block is T => !!block);
  if (movingBlocks.length === 0) return null;

  const parentId = movingBlocks[0].parent_block_id ?? null;
  if (!movingBlocks.every((block) => (block.parent_block_id ?? null) === parentId)) {
    return null;
  }

  const siblings = getBlocksInParent(blocks, parentId);
  if (!siblings.some((block) => block.id === targetBlockId)) return null;

  const remaining = siblings.filter((block) => !movingSet.has(block.id));
  const targetIdx = remaining.findIndex((block) => block.id === targetBlockId);
  if (targetIdx < 0) return null;

  const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
  const reordered = [
    ...remaining.slice(0, insertAt),
    ...movingBlocks,
    ...remaining.slice(insertAt),
  ].map((block, index) => ({ ...block, order_index: index }));

  const reorderedMap = new Map(reordered.map((block) => [block.id, block]));
  return blocks.map((block) => {
    if ((block.parent_block_id ?? null) !== parentId) return block;
    return reorderedMap.get(block.id) ?? block;
  });
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
