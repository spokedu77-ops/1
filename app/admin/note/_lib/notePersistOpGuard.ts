import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

const BLANK_VISIBLE_TYPES = new Set<NoteBlock['type']>([
  'text',
  'todo',
  'bulletList',
  'numberedList',
]);

function textLikeContentIsBlank(content: Record<string, unknown> | null | undefined): boolean {
  const text = typeof content?.text === 'string' ? content.text.trim() : '';
  const title = typeof content?.title === 'string' ? content.title.trim() : '';
  const html = typeof content?.html === 'string'
    ? content.html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    : '';
  return !text && !title && !html;
}

function applyPatch(block: NoteBlock, patch: NoteBlockFieldPatch): NoteBlock {
  return {
    ...block,
    ...(patch.type !== undefined ? { type: patch.type as NoteBlock['type'] } : {}),
    ...(patch.content !== undefined ? { content: patch.content as Record<string, unknown> } : {}),
    ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
    ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
    ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
  };
}

function assertNoDuplicateSiblingOrders(blocks: NoteBlock[]): void {
  const groups = new Map<string, Map<number, string[]>>();
  for (const block of blocks) {
    const key = `${block.document_id}::${block.parent_block_id ?? '__root__'}`;
    const orders = groups.get(key) ?? new Map<number, string[]>();
    const ids = orders.get(block.order_index) ?? [];
    ids.push(block.id);
    orders.set(block.order_index, ids);
    groups.set(key, orders);
  }

  for (const [key, orders] of groups) {
    for (const [order, ids] of orders) {
      if (ids.length > 1) {
        throw new Error(`[Note] blocked invalid write: duplicate sibling order ${key} order=${order} ids=${ids.join(',')}`);
      }
    }
  }
}

function blockFromCreate(op: Extract<NotePersistOp, { type: 'createBlock' }>): NoteBlock {
  const now = new Date().toISOString();
  return {
    id: op.id,
    document_id: op.documentId,
    parent_block_id: op.parent_block_id,
    type: op.blockType,
    order_index: op.order_index ?? 0,
    content: op.content,
    created_at: now,
    updated_at: now,
    version: 1,
  };
}

function assertCreateIsAllowed(op: Extract<NotePersistOp, { type: 'createBlock' }>): void {
  if (op.allowEmptyVisibleCreate) return;
  if (!BLANK_VISIBLE_TYPES.has(op.blockType)) return;
  if (!textLikeContentIsBlank(op.content)) return;
  throw new Error(`[Note] blocked invalid write: non-user empty ${op.blockType} create`);
}

function applyPatchesById(blocks: NoteBlock[], patches: NoteBlockFieldPatch[]): NoteBlock[] {
  if (patches.length === 0) return blocks;
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  return blocks.map((block) => {
    const patch = patchById.get(block.id);
    return patch ? applyPatch(block, patch) : block;
  });
}

export function assertPersistOpIsSafe(op: NotePersistOp, currentBlocks: NoteBlock[]): void {
  if (op.type === 'createBlock') {
    assertCreateIsAllowed(op);
    const existing = currentBlocks.some((block) => block.id === op.id);
    const createBlock = blockFromCreate(op);
    const blocksWithCreate = existing
      ? currentBlocks.map((block) => (block.id === op.id ? { ...block, ...createBlock } : block))
      : [...currentBlocks, createBlock];
    const patches = [
      ...(op.normalizeOrders ?? []).map((patch) => ({ id: patch.id, order_index: patch.order_index })),
      ...(op.transactionUpdates ?? []),
    ];
    assertNoDuplicateSiblingOrders(applyPatchesById(blocksWithCreate, patches));
    return;
  }

  if (op.type === 'patchFields') {
    assertNoDuplicateSiblingOrders(applyPatchesById(currentBlocks, op.patches));
    return;
  }

  if (op.type === 'blockTransaction') {
    const deleteIds = new Set(op.deleteIds);
    let next = currentBlocks.filter((block) => !deleteIds.has(block.id));
    next = applyPatchesById(next, op.patches);
    if (op.creates) {
      for (const create of op.creates) {
        if (BLANK_VISIBLE_TYPES.has(create.type) && textLikeContentIsBlank(create.content)) {
          throw new Error(`[Note] blocked invalid write: empty ${create.type} transaction create`);
        }
        next.push({
          id: create.id,
          document_id: create.document_id,
          parent_block_id: create.parent_block_id,
          type: create.type,
          order_index: create.order_index,
          content: create.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        });
      }
    }
    assertNoDuplicateSiblingOrders(next);
  }
}
