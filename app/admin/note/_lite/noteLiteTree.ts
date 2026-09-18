import {
  assignSiblingOrdersFromEncounter,
  blockText,
  sortLiteBlocksForDisplay,
  type NoteLiteBlock,
  type NoteLiteBlockType,
} from '@/app/lib/note/noteLiteInvariants';

export function newLiteBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyLiteBlock(
  documentId: string,
  type: NoteLiteBlockType,
  parentId: string | null,
): NoteLiteBlock {
  return {
    id: newLiteBlockId(),
    document_id: documentId,
    parent_block_id: parentId,
    type,
    order_index: 0,
    content: type === 'todo' ? { text: '', checked: false } : { text: '' },
  };
}

function subtreeIds(rootId: string, blocks: NoteLiteBlock[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of blocks) {
      if (b.parent_block_id && ids.has(b.parent_block_id) && !ids.has(b.id)) {
        ids.add(b.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function insertBlockAfter(
  blocks: NoteLiteBlock[],
  afterId: string | null,
  created: NoteLiteBlock,
): NoteLiteBlock[] {
  if (!afterId) {
    return assignSiblingOrdersFromEncounter([created, ...blocks]);
  }
  const idx = blocks.findIndex((b) => b.id === afterId);
  if (idx < 0) return assignSiblingOrdersFromEncounter([...blocks, created]);
  const after = blocks[idx]!;
  created = { ...created, parent_block_id: after.parent_block_id };
  const next = [...blocks];
  next.splice(idx + 1, 0, created);
  return assignSiblingOrdersFromEncounter(next);
}

export function updateBlockText(blocks: NoteLiteBlock[], id: string, text: string): NoteLiteBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, content: { ...b.content, text } } : b));
}

export function toggleTodoChecked(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  return blocks.map((b) => {
    if (b.id !== id || b.type !== 'todo') return b;
    return { ...b, content: { ...b.content, checked: !b.content.checked } };
  });
}

export function setBlockType(
  blocks: NoteLiteBlock[],
  id: string,
  type: NoteLiteBlockType,
): NoteLiteBlock[] {
  return blocks.map((b) => {
    if (b.id !== id) return b;
    const text = blockText(b.content);
    const content =
      type === 'todo' ? { text, checked: Boolean(b.content.checked) } : { text };
    return { ...b, type, content };
  });
}

export function removeBlock(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const drop = subtreeIds(id, blocks);
  return assignSiblingOrdersFromEncounter(blocks.filter((b) => !drop.has(b.id)));
}

export function mergeIntoPrevious(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx <= 0) return blocks;
  const current = blocks[idx]!;
  const prev = blocks[idx - 1]!;
  if (prev.parent_block_id !== current.parent_block_id) return blocks;
  const merged = `${blockText(prev.content)}${blockText(current.content)}`;
  const without = blocks.filter((b) => b.id !== id);
  return assignSiblingOrdersFromEncounter(
    without.map((b) =>
      b.id === prev.id ? { ...b, content: { ...b.content, text: merged } } : b,
    ),
  );
}

export function indentBlock(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const siblings = blocks.filter((b) => {
    const target = blocks.find((x) => x.id === id);
    return target && b.parent_block_id === target.parent_block_id;
  });
  const pos = siblings.findIndex((b) => b.id === id);
  if (pos <= 0) return blocks;
  const prev = siblings[pos - 1]!;
  const forbidden = subtreeIds(id, blocks);
  if (forbidden.has(prev.id)) return blocks;
  return assignSiblingOrdersFromEncounter(
    blocks.map((b) => (b.id === id ? { ...b, parent_block_id: prev.id } : b)),
  );
}

export function outdentBlock(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const current = blocks.find((b) => b.id === id);
  if (!current?.parent_block_id) return blocks;
  const parent = blocks.find((b) => b.id === current.parent_block_id);
  if (!parent) {
    return assignSiblingOrdersFromEncounter(
      blocks.map((b) => (b.id === id ? { ...b, parent_block_id: null } : b)),
    );
  }
  const next = [...blocks];
  const parentIdx = next.findIndex((b) => b.id === parent.id);
  const selfIdx = next.findIndex((b) => b.id === id);
  const [row] = next.splice(selfIdx, 1);
  if (!row) return blocks;
  const insertAt = parentIdx < selfIdx ? parentIdx + 1 : parentIdx + 1;
  next.splice(insertAt, 0, { ...row, parent_block_id: parent.parent_block_id });
  return assignSiblingOrdersFromEncounter(next);
}

export function moveBlockBefore(
  blocks: NoteLiteBlock[],
  dragId: string,
  beforeId: string,
): NoteLiteBlock[] {
  if (dragId === beforeId) return blocks;
  const moving = subtreeIds(dragId, blocks);
  if (moving.has(beforeId)) return blocks;
  const drag = blocks.find((b) => b.id === dragId);
  const before = blocks.find((b) => b.id === beforeId);
  if (!drag || !before) return blocks;
  const rest = blocks.filter((b) => !moving.has(b.id));
  const beforeIdx = rest.findIndex((b) => b.id === beforeId);
  const subtree = blocks.filter((b) => moving.has(b.id)).map((b) =>
    b.id === dragId ? { ...b, parent_block_id: before.parent_block_id } : b,
  );
  const next = [...rest];
  next.splice(Math.max(0, beforeIdx), 0, ...subtree);
  return assignSiblingOrdersFromEncounter(next);
}

export function moveBlockAfter(
  blocks: NoteLiteBlock[],
  dragId: string,
  afterId: string,
): NoteLiteBlock[] {
  if (dragId === afterId) return blocks;
  const moving = subtreeIds(dragId, blocks);
  if (moving.has(afterId)) return blocks;
  const drag = blocks.find((b) => b.id === dragId);
  const after = blocks.find((b) => b.id === afterId);
  if (!drag || !after) return blocks;
  const rest = blocks.filter((b) => !moving.has(b.id));
  const afterIdx = rest.findIndex((b) => b.id === afterId);
  if (afterIdx < 0) return blocks;
  const subtree = blocks.filter((b) => moving.has(b.id)).map((b) =>
    b.id === dragId ? { ...b, parent_block_id: after.parent_block_id } : b,
  );
  const next = [...rest];
  next.splice(afterIdx + 1, 0, ...subtree);
  return assignSiblingOrdersFromEncounter(next);
}

function siblingsInVisualOrder(blocks: NoteLiteBlock[], parentId: string | null): NoteLiteBlock[] {
  return sortLiteBlocksForDisplay(blocks).filter((b) => b.parent_block_id === parentId);
}

/** 같은 들여쓰기(형제) 안에서 한 칸 위로. 자식 블록은 함께 이동. */
export function moveBlockUp(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const current = blocks.find((b) => b.id === id);
  if (!current) return blocks;
  const siblings = siblingsInVisualOrder(blocks, current.parent_block_id);
  const pos = siblings.findIndex((b) => b.id === id);
  if (pos <= 0) return blocks;
  const prev = siblings[pos - 1]!;
  return moveBlockBefore(blocks, id, prev.id);
}

/** 같은 들여쓰기(형제) 안에서 한 칸 아래로. 자식 블록은 함께 이동. */
export function moveBlockDown(blocks: NoteLiteBlock[], id: string): NoteLiteBlock[] {
  const current = blocks.find((b) => b.id === id);
  if (!current) return blocks;
  const siblings = siblingsInVisualOrder(blocks, current.parent_block_id);
  const pos = siblings.findIndex((b) => b.id === id);
  if (pos < 0 || pos >= siblings.length - 1) return blocks;
  const next = siblings[pos + 1]!;
  return moveBlockAfter(blocks, id, next.id);
}

export function detectMarkdownType(text: string): { type: NoteLiteBlockType; text: string } | null {
  if (text.startsWith('### ')) return { type: 'heading3', text: text.slice(4) };
  if (text.startsWith('## ')) return { type: 'heading2', text: text.slice(3) };
  if (text.startsWith('# ')) return { type: 'heading', text: text.slice(2) };
  if (text.startsWith('- ') || text.startsWith('* ') || text.startsWith('+ ')) {
    return { type: 'bulletList', text: text.slice(2) };
  }
  const numbered = text.match(/^(\d+)[.)] /);
  if (numbered) return { type: 'numberedList', text: text.slice(numbered[0].length) };
  if (text.startsWith('[] ') || text.startsWith('[ ] ')) {
    return { type: 'todo', text: text.replace(/^\[\]\s|^\[ \]\s/, '') };
  }
  return null;
}
