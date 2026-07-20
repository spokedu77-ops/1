import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  getBlocksInParent,
  getBlockRangeIdsInVisualOrder,
  LIST_CONTAINER_TYPES,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import { COLUMN_TYPE } from './noteColumnBlock';
import { supportsInsideDropTarget } from './noteBlockSemantics';
import type { NoteBlock } from './types';
import type { BlockDropTarget } from '../_components/noteContexts';

export const DROP_GAP_PX = 6;
export const TOGGLE_TITLE_BAND_PX = 34;
export const PAGE_DROP_EDGE_RATIO = 0.25;
const LIST_DROP_EDGE_RATIO = 0.25;

export type RowRect = { top: number; height: number };

function escapeCssAttrValue(value: string): string {
  if (typeof globalThis.CSS?.escape === 'function') {
    return globalThis.CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function blockSupportsInsideDrop(type: string): boolean {
  return supportsInsideDropTarget(type);
}

/** 블록 타입·행 rect·포인터 Y로 before / after / inside 결정 (Notion-style) */
export function resolveDropPositionForBlock(
  blockType: string,
  rect: RowRect,
  pointerY: number,
  options?: { titleBandBottom?: number },
): BlockDropPosition {
  const { top, height } = rect;
  const rel = pointerY - top;

  if (blockType === 'toggle') {
    const bandBottom = options?.titleBandBottom ?? top + Math.min(TOGGLE_TITLE_BAND_PX, height);
    const bandHeight = Math.max(bandBottom - top, 1);
    if (rel <= bandHeight * 0.28) return 'before';
    if (pointerY <= bandBottom) return 'inside';
    return 'after';
  }

  if (blockType === 'page') {
    if (rel <= height * PAGE_DROP_EDGE_RATIO) return 'before';
    if (rel >= height * (1 - PAGE_DROP_EDGE_RATIO)) return 'after';
    return 'inside';
  }

  if (LIST_CONTAINER_TYPES.has(blockType)) {
    if (rel <= height * LIST_DROP_EDGE_RATIO) return 'before';
    if (rel >= height * (1 - LIST_DROP_EDGE_RATIO)) return 'after';
    return 'inside';
  }

  if (blockType === COLUMN_TYPE) {
    if (rel <= height * LIST_DROP_EDGE_RATIO) return 'before';
    if (rel >= height * (1 - LIST_DROP_EDGE_RATIO)) return 'after';
    return 'inside';
  }

  return rel < height * 0.5 ? 'before' : 'after';
}

type RowCandidate = {
  id: string;
  rect: DOMRect;
  nestDepth: number;
};

function collectVisibleRowCandidates(excludeId: string): RowCandidate[] {
  const result: RowCandidate[] = [];
  document.querySelectorAll<HTMLElement>('[data-note-block-row]').forEach((row) => {
    const id = row.getAttribute('data-block-id');
    if (!id || id === excludeId) return;
    result.push({
      id,
      rect: row.getBoundingClientRect(),
      nestDepth: parseInt(row.getAttribute('data-nest-depth') ?? '1', 10),
    });
  });
  return result;
}

function readToggleTitleBandBottom(rowEl: HTMLElement): number | undefined {
  const title = rowEl.querySelector('[data-toggle-title]');
  if (!title) return undefined;
  return title.getBoundingClientRect().bottom;
}

function pickRowAtPointer(candidates: RowCandidate[], pointerY: number): RowCandidate | null {
  const containing = candidates.filter((candidate) => {
    const top = candidate.rect.top - DROP_GAP_PX;
    const bottom = candidate.rect.bottom + DROP_GAP_PX;
    return pointerY >= top && pointerY <= bottom;
  });

  if (containing.length > 0) {
    containing.sort((a, b) => {
      const depthDiff = b.nestDepth - a.nestDepth;
      if (depthDiff !== 0) return depthDiff;
      const aCenter = a.rect.top + a.rect.height / 2;
      const bCenter = b.rect.top + b.rect.height / 2;
      return Math.abs(pointerY - aCenter) - Math.abs(pointerY - bCenter);
    });
    return containing[0];
  }

  let best: RowCandidate | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = pointerY < candidate.rect.top
      ? candidate.rect.top - pointerY
      : pointerY > candidate.rect.bottom
        ? pointerY - candidate.rect.bottom
        : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return bestDist <= DROP_GAP_PX * 2 ? best : null;
}

function findChildBlockDropTargetAtY(
  parentId: string,
  pointerY: number,
  blocks: NoteBlock[],
): BlockDropTarget | null {
  const children = getBlocksInParent(blocks, parentId);
  for (const child of children) {
    const row = document.querySelector<HTMLElement>(
      `[data-note-block-row][data-block-id="${escapeCssAttrValue(child.id)}"]`,
    );
    if (!row) continue;
    const rect = row.getBoundingClientRect();
    const top = rect.top - DROP_GAP_PX;
    const bottom = rect.bottom + DROP_GAP_PX;
    if (pointerY < top || pointerY > bottom) continue;
    const position = pointerY < rect.top + rect.height / 2 ? 'before' : 'after';
    return { blockId: child.id, position };
  }
  return null;
}

function resolveToggleBodyGapTarget(
  pointerY: number,
  blocks: NoteBlock[],
  candidates: RowCandidate[],
): BlockDropTarget | null {
  for (const candidate of candidates) {
    const block = blocks.find((item) => item.id === candidate.id);
    if (block?.type !== 'toggle') continue;

    const children = getBlocksInParent(blocks, block.id);
    if (children.length === 0) {
      if (
        pointerY > candidate.rect.bottom
        && pointerY <= candidate.rect.bottom + DROP_GAP_PX * 3
      ) {
        return { blockId: block.id, position: 'inside' };
      }
      continue;
    }

    const firstChildRow = candidates.find((row) => row.id === children[0].id);
    if (!firstChildRow) continue;
    if (pointerY > candidate.rect.bottom && pointerY < firstChildRow.rect.top) {
      return { blockId: firstChildRow.id, position: 'before' };
    }
  }
  return null;
}

function isDescendantBlock(blocks: NoteBlock[], ancestorId: string, blockId: string): boolean {
  let parentId = blocks.find((block) => block.id === blockId)?.parent_block_id ?? null;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = blocks.find((block) => block.id === parentId)?.parent_block_id ?? null;
  }
  return false;
}

/** 포인터 Y + DOM 행 rect로 드롭 타깃 결정 — dnd-kit over.id와 분리해 안정화 */
export function resolveBlockDropTargetFromPointer(
  pointerY: number,
  blocks: NoteBlock[],
  activeBlockId: string | null,
): BlockDropTarget {
  if (typeof document === 'undefined') return null;

  const candidates = collectVisibleRowCandidates(activeBlockId ?? '');
  if (candidates.length === 0) return null;

  const gapTarget = resolveToggleBodyGapTarget(pointerY, blocks, candidates);
  if (gapTarget) {
    if (activeBlockId && (
      gapTarget.blockId === activeBlockId
      || isDescendantBlock(blocks, activeBlockId, gapTarget.blockId)
    )) {
      return null;
    }
    return gapTarget;
  }

  const row = pickRowAtPointer(candidates, pointerY);
  if (!row) return null;

  if (
    activeBlockId
    && (row.id === activeBlockId || isDescendantBlock(blocks, activeBlockId, row.id))
  ) {
    return null;
  }

  const block = blocks.find((item) => item.id === row.id);
  if (!block) return null;

  const rowEl = document.querySelector<HTMLElement>(
    `[data-note-block-row][data-block-id="${escapeCssAttrValue(row.id)}"]`,
  );

  if (block.type === 'toggle') {
    const titleBandBottom = rowEl
      ? readToggleTitleBandBottom(rowEl)
      : undefined;
    const headerBottom = titleBandBottom ?? row.rect.top + Math.min(TOGGLE_TITLE_BAND_PX, row.rect.height);
    if (pointerY > headerBottom) {
      const childTarget = findChildBlockDropTargetAtY(block.id, pointerY, blocks);
      if (childTarget) {
        if (
          activeBlockId
          && (
            childTarget.blockId === activeBlockId
            || isDescendantBlock(blocks, activeBlockId, childTarget.blockId)
          )
        ) {
          return null;
        }
        return childTarget;
      }
      return { blockId: block.id, position: 'inside' };
    }
  }

  const position = resolveDropPositionForBlock(
    block.type,
    { top: row.rect.top, height: row.rect.height },
    pointerY,
    rowEl && block.type === 'toggle'
      ? { titleBandBottom: readToggleTitleBandBottom(rowEl) }
      : undefined,
  );

  if (position === 'inside' && !blockSupportsInsideDrop(block.type)) {
    return {
      blockId: row.id,
      position: pointerY < row.rect.top + row.rect.height / 2 ? 'before' : 'after',
    };
  }

  return { blockId: row.id, position };
}

export function resolveBlockDropTarget(
  overId: string,
  blocks: NoteBlock[],
  event: DragOverEvent | DragEndEvent,
  pointerY: number,
  activeBlockId?: string | null,
): BlockDropTarget {
  if (overId.startsWith('block-inside:')) {
    const blockId = overId.slice('block-inside:'.length);
    const container = blocks.find((block) => block.id === blockId);
    if (!container || !blockSupportsInsideDrop(container.type)) return null;
    return { blockId, position: 'inside' };
  }

  const pointerTarget = resolveBlockDropTargetFromPointer(
    pointerY,
    blocks,
    activeBlockId ?? null,
  );
  if (pointerTarget) return pointerTarget;

  const overBlock = blocks.find((b) => b.id === overId);
  const over = event.over;
  if (!overBlock || !over?.rect) return null;

  const position = resolveDropPositionForBlock(
    overBlock.type,
    { top: over.rect.top, height: over.rect.height },
    pointerY,
  );
  if (position === 'inside' && !blockSupportsInsideDrop(overBlock.type)) {
    return {
      blockId: overId,
      position: pointerY < over.rect.top + over.rect.height / 2 ? 'before' : 'after',
    };
  }
  return { blockId: overId, position };
}

export const noteBlockCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCenter(args);

  const pointerY = args.pointerCoordinates?.y ?? 0;

  return [...hits].sort((a, b) => {
    const aId = String(a.id);
    const bId = String(b.id);
    const aIsInside = aId.startsWith('block-inside:');
    const bIsInside = bId.startsWith('block-inside:');

    if (aIsInside !== bIsInside) {
      const insideBlockId = (aIsInside ? aId : bId).slice('block-inside:'.length);
      const row = document.querySelector<HTMLElement>(
        `[data-note-block-row][data-block-id="${escapeCssAttrValue(insideBlockId)}"]`,
      );
      if (row) {
        const rect = row.getBoundingClientRect();
        const rel = pointerY - rect.top;
        const edge = Math.max(6, rect.height * 0.22);
        const nearEdge = rel <= edge || rel >= rect.height - edge;
        if (nearEdge) return aIsInside ? 1 : -1;
      }
      return aIsInside ? 1 : -1;
    }

    const aContainer = args.droppableContainers.find((container) => container.id === a.id);
    const bContainer = args.droppableContainers.find((container) => container.id === b.id);
    const aType = aContainer?.data.current?.type;
    const bType = bContainer?.data.current?.type;
    const priority = (type: unknown) =>
      type === 'block-inside' ? 2
        : type === 'document' || type === 'document-drop-target' ? 1
        : 0;
    const priorityDiff = priority(aType) - priority(bType);
    if (priorityDiff !== 0) return priorityDiff;

    const aRect = aContainer?.rect.current;
    const bRect = bContainer?.rect.current;
    const aArea = aRect ? aRect.width * aRect.height : Number.POSITIVE_INFINITY;
    const bArea = bRect ? bRect.width * bRect.height : Number.POSITIVE_INFINITY;
    return aArea - bArea;
  });
};

export function getSiblingBlockRangeIds(
  blocks: NoteBlock[],
  fromId: string,
  toId: string,
): string[] {
  const from = blocks.find((b) => b.id === fromId);
  const to = blocks.find((b) => b.id === toId);
  if (!from || !to) return toId ? [toId] : fromId ? [fromId] : [];
  if (from.parent_block_id !== to.parent_block_id) {
    return getBlockRangeIdsInVisualOrder(blocks, fromId, toId);
  }
  const siblings = getBlocksInParent(blocks, from.parent_block_id ?? null);
  const ids = siblings.map((b) => b.id);
  const startIdx = ids.indexOf(fromId);
  const endIdx = ids.indexOf(toId);
  if (startIdx < 0 || endIdx < 0) return [toId];
  return ids.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
}
