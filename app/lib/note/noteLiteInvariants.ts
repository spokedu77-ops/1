/** 라이트 메모장 — 본문·순서가 Intent 없이 바뀌지 않는다. */

export const NOTE_LITE_BLOCK_TYPES = [
  'text',
  'heading',
  'heading2',
  'heading3',
  'bulletList',
  'numberedList',
  'todo',
] as const;

export type NoteLiteBlockType = (typeof NOTE_LITE_BLOCK_TYPES)[number];

export type NoteLiteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: NoteLiteBlockType;
  order_index: number;
  content: {
    text?: string;
    checked?: boolean;
  };
};

export function isNoteLiteBlockType(type: string): type is NoteLiteBlockType {
  return (NOTE_LITE_BLOCK_TYPES as readonly string[]).includes(type);
}

/** 서버에 블록이 있는데 클라이언트가 빈 배열이면 거부. 명시적 allowEmpty만 예외. */
export function shouldRejectEmptySnapshot(input: {
  existingLiveCount: number;
  incomingCount: number;
  allowEmpty: boolean;
}): boolean {
  if (input.allowEmpty) return false;
  return input.existingLiveCount > 0 && input.incomingCount === 0;
}

/** hydrate 전·다른 문서 스냅샷은 persist 금지 */
export function canClientPersistSnapshot(input: {
  hydrated: boolean;
  openDocumentId: string | null;
  snapshotDocumentId: string | null;
}): boolean {
  if (!input.hydrated) return false;
  if (!input.openDocumentId || !input.snapshotDocumentId) return false;
  return input.openDocumentId === input.snapshotDocumentId;
}

type OrderRow = {
  id: string;
  parent_block_id: string | null;
  order_index: number;
};

/**
 * 표시 순서: 같은 parent 안에서 order_index.
 * 동점은 입력 배열 만남 순서 유지 (id로 재섞지 않음).
 */
export function sortLiteBlocksForDisplay<T extends OrderRow>(blocks: T[]): T[] {
  const encounter = new Map<string, number>();
  blocks.forEach((b, i) => encounter.set(b.id, i));
  const grouped = new Map<string, T[]>();
  for (const b of blocks) {
    const key = b.parent_block_id ?? '';
    const list = grouped.get(key) ?? [];
    list.push(b);
    grouped.set(key, list);
  }
  const out: T[] = [];
  const walk = (parentId: string | null) => {
    const kids = grouped.get(parentId ?? '') ?? [];
    kids.sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index;
      return (encounter.get(a.id) ?? 0) - (encounter.get(b.id) ?? 0);
    });
    for (const kid of kids) {
      out.push(kid);
      walk(kid.id);
    }
  };
  walk(null);
  const seen = new Set(out.map((b) => b.id));
  for (const b of blocks) {
    if (!seen.has(b.id)) out.push(b);
  }
  return out;
}

/** 같은 parent에서 order가 겹칠 때만 0..n-1. 만남 순서 유지. */
export function densifyDuplicateSiblingOrders<T extends OrderRow>(blocks: T[]): T[] {
  const grouped = new Map<string, T[]>();
  for (const b of blocks) {
    const key = b.parent_block_id ?? '';
    const list = grouped.get(key) ?? [];
    list.push(b);
    grouped.set(key, list);
  }
  const remap = new Map<string, number>();
  for (const list of grouped.values()) {
    const orders = list.map((b) => b.order_index);
    const hasDup = new Set(orders).size !== orders.length;
    if (!hasDup) continue;
    list.forEach((b, i) => remap.set(b.id, i));
  }
  if (remap.size === 0) return blocks;
  return blocks.map((b) => (remap.has(b.id) ? { ...b, order_index: remap.get(b.id)! } : b));
}

/** 저장 Intent: 같은 parent 안을 배열 등장 순으로 0..n-1 */
export function assignSiblingOrdersFromEncounter<T extends OrderRow>(blocks: T[]): T[] {
  const counts = new Map<string, number>();
  return blocks.map((b) => {
    const key = b.parent_block_id ?? '';
    const next = counts.get(key) ?? 0;
    counts.set(key, next + 1);
    return { ...b, order_index: next };
  });
}

export function siblingRelativeOrderSignature<T extends OrderRow>(blocks: T[]): string {
  const sorted = sortLiteBlocksForDisplay(blocks);
  return sorted.map((b) => `${b.parent_block_id ?? 'root'}:${b.id}`).join('|');
}

export function blockText(content: NoteLiteBlock['content'] | null | undefined): string {
  return typeof content?.text === 'string' ? content.text : '';
}
