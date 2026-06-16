import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  getBlocksInParent,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';
import type { BlockDropTarget } from '../_components/noteContexts';

const TOGGLE_TITLE_DROP_BAND_PX = 34;
const PAGE_DROP_EDGE_RATIO = 0.35;

function escapeCssAttrValue(value: string): string {
  if (typeof globalThis.CSS?.escape === 'function') {
    return globalThis.CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function resolvePageDropPosition(
  top: number,
  height: number,
  pointerY: number,
): BlockDropPosition {
  const rel = pointerY - top;
  if (rel <= height * PAGE_DROP_EDGE_RATIO) return 'before';
  if (rel >= height * (1 - PAGE_DROP_EDGE_RATIO)) return 'after';
  return 'inside';
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
    if (pointerY < rect.top || pointerY > rect.bottom) continue;
    const position = pointerY < rect.top + rect.height / 2 ? 'before' : 'after';
    return { blockId: child.id, position };
  }
  return null;
}

function resolveDropPosition(
  overBlock: NoteBlock,
  over: { rect: { top: number; height: number } },
  pointerY: number,
): BlockDropPosition {
  const { top, height } = over.rect;
  if (overBlock.type === 'toggle') {
    const band = Math.min(TOGGLE_TITLE_DROP_BAND_PX, height);
    if (pointerY <= top + band * 0.3) return 'before';
    if (pointerY <= top + band * 0.65) return 'inside';
    return 'after';
  }
  if (overBlock.type === 'page') {
    return resolvePageDropPosition(top, height, pointerY);
  }
  return pointerY < top + height / 2 ? 'before' : 'after';
}

export function resolveBlockDropTarget(
  overId: string,
  blocks: NoteBlock[],
  event: DragOverEvent | DragEndEvent,
  pointerY: number,
): BlockDropTarget {
  if (overId.startsWith('block-inside:')) {
    const blockId = overId.slice('block-inside:'.length);
    const container = blocks.find((block) => block.id === blockId);
    if (!container || (container.type !== 'toggle' && container.type !== 'page')) return null;
    if (container.type === 'toggle') {
      const over = event.over;
      if (over?.rect) {
        const band = Math.min(TOGGLE_TITLE_DROP_BAND_PX, over.rect.height);
        const headerBottom = over.rect.top + band;
        if (pointerY > headerBottom) {
          const childTarget = findChildBlockDropTargetAtY(blockId, pointerY, blocks);
          if (childTarget) return childTarget;
        }
      }
      return { blockId, position: 'inside' };
    }
    if (container.type === 'page') {
      const row = document.querySelector<HTMLElement>(
        `[data-note-block-row][data-block-id="${escapeCssAttrValue(blockId)}"]`,
      );
      const rect = row?.getBoundingClientRect() ?? event.over?.rect;
      if (rect) {
        return {
          blockId,
          position: resolvePageDropPosition(rect.top, rect.height, pointerY),
        };
      }
      return { blockId, position: 'inside' };
    }
    return { blockId, position: 'inside' };
  }
  const over = event.over;
  const overBlock = blocks.find((b) => b.id === overId);
  if (!overBlock || !over?.rect) return null;
  if (overBlock.type === 'toggle') {
    const band = Math.min(TOGGLE_TITLE_DROP_BAND_PX, over.rect.height);
    const headerBottom = over.rect.top + band;
    if (pointerY > headerBottom) {
      const childTarget = findChildBlockDropTargetAtY(overBlock.id, pointerY, blocks);
      if (childTarget) return childTarget;
    }
  }
  if (overBlock.type === 'page') {
    return { blockId: overId, position: resolvePageDropPosition(over.rect.top, over.rect.height, pointerY) };
  }
  return { blockId: overId, position: resolveDropPosition(overBlock, over, pointerY) };
}

export const noteBlockCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    return [...hits].sort((a, b) => {
      const aContainer = args.droppableContainers.find((container) => container.id === a.id);
      const bContainer = args.droppableContainers.find((container) => container.id === b.id);
      const aType = aContainer?.data.current?.type;
      const bType = bContainer?.data.current?.type;
      const priority = (type: unknown) =>
        type === 'block-inside' ? 3
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
  }
  return closestCenter(args);
};

export function getSiblingBlockRangeIds(
  blocks: NoteBlock[],
  fromId: string,
  toId: string,
): string[] {
  const from = blocks.find((b) => b.id === fromId);
  const to = blocks.find((b) => b.id === toId);
  if (!from || !to) return toId ? [toId] : fromId ? [fromId] : [];
  if (from.parent_block_id !== to.parent_block_id) return [toId];
  const siblings = getBlocksInParent(blocks, from.parent_block_id ?? null);
  const ids = siblings.map((b) => b.id);
  const startIdx = ids.indexOf(fromId);
  const endIdx = ids.indexOf(toId);
  if (startIdx < 0 || endIdx < 0) return [toId];
  return ids.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
}
