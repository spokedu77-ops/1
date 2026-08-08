import type { NoteBlock } from './types';

export type NoteCreatePersistOrders = {
  order_index: number;
  normalizeOrders: Array<{ id: string; order_index: number }>;
  /** store에 create가 없을 때 재적용할 형제 목록(이미 있으면 null) */
  repairedSiblings: NoteBlock[] | null;
};

function siblingKey(block: Pick<NoteBlock, 'parent_block_id'>): string | null {
  return block.parent_block_id ?? null;
}

/** order_index 우선. 동점은 입력 만남 순서(stable) — id.localeCompare 재섞기 금지 (ZERO LOSS #4) */
function sortSiblings(blocks: NoteBlock[]): NoteBlock[] {
  return [...blocks].sort((left, right) => left.order_index - right.order_index);
}

function hasDuplicateOrders(blocks: NoteBlock[]): boolean {
  const seen = new Set<number>();
  for (const block of blocks) {
    if (seen.has(block.order_index)) return true;
    seen.add(block.order_index);
  }
  return false;
}

/**
 * createBlock persist 직전 — store/optimistic 기준으로 형제 order를 유일하게 맞춤.
 * reconcile race로 create가 빠지거나 order가 꼬여도 duplicate sibling order 가드에 안 걸리게 한다.
 */
export function resolveCreateBlockPersistOrders(options: {
  blocks: ReadonlyArray<NoteBlock>;
  documentId: string;
  createdId: string;
  parentId: string | null;
  fallbackInsertIndex: number;
  createdBlock?: NoteBlock;
}): NoteCreatePersistOrders {
  const docBlocks = options.blocks.filter((block) => block.document_id === options.documentId);
  let siblings = sortSiblings(
    docBlocks.filter((block) => siblingKey(block) === options.parentId),
  );
  let repairedSiblings: NoteBlock[] | null = null;

  if (!siblings.some((block) => block.id === options.createdId)) {
    if (!options.createdBlock) {
      return {
        order_index: options.fallbackInsertIndex,
        normalizeOrders: siblings.map((block, index) => ({
          id: block.id,
          order_index: index >= options.fallbackInsertIndex ? index + 1 : index,
        })),
        repairedSiblings: null,
      };
    }
    const clamped = Math.max(0, Math.min(options.fallbackInsertIndex, siblings.length));
    siblings = [
      ...siblings.slice(0, clamped),
      { ...options.createdBlock, parent_block_id: options.parentId, order_index: clamped },
      ...siblings.slice(clamped),
    ];
    repairedSiblings = siblings.map((block, index) => (
      block.order_index === index ? block : { ...block, order_index: index }
    ));
    siblings = repairedSiblings;
  } else if (hasDuplicateOrders(siblings)) {
    repairedSiblings = siblings.map((block, index) => (
      block.order_index === index ? block : { ...block, order_index: index }
    ));
    siblings = repairedSiblings;
  }

  const created = siblings.find((block) => block.id === options.createdId);
  const order_index = created?.order_index ?? options.fallbackInsertIndex;
  return {
    order_index,
    normalizeOrders: siblings
      .filter((block) => block.id !== options.createdId)
      .map((block) => ({ id: block.id, order_index: block.order_index })),
    repairedSiblings,
  };
}
