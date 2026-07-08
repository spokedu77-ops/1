import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { noteBlockOpTypeFromPayload } from '@/app/lib/note/noteBlockOpTypes';

function newClientOpId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** NotePersistOp → 서버 push 항목 (1 persist op = 1~N push items) */
export function persistOpToPushItems(op: NotePersistOp): NoteBlockOpPushItem[] {
  switch (op.type) {
  case 'patchContent': {
    return op.updates.map((update) => ({
      clientOpId: newClientOpId(),
      opType: 'patch_content' as const,
      payload: {
        opType: 'patch_content' as const,
        blockId: update.id,
        content: update.content,
      },
    }));
  }
  case 'patchFields': {
    if (op.patches.length === 0) return [];
    return [{
      clientOpId: newClientOpId(),
      opType: 'patch_fields',
      payload: {
        opType: 'patch_fields',
        patches: op.patches.map((patch) => ({
          id: patch.id,
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.content !== undefined ? { content: patch.content } : {}),
          ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
          ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
          ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
          ...(patch.expected_version !== undefined ? { expected_version: patch.expected_version } : {}),
        })),
      },
    }];
  }
  case 'softDelete': {
    if (op.ids.length === 0) return [];
    return [{
      clientOpId: newClientOpId(),
      opType: 'soft_delete',
      payload: { opType: 'soft_delete', ids: op.ids },
    }];
  }
  case 'createBlock': {
    return [{
      clientOpId: newClientOpId(),
      opType: 'create_block',
      payload: {
        opType: 'create_block',
        id: op.id,
        documentId: op.documentId,
        blockType: op.blockType,
        content: op.content,
        order_index: op.order_index,
        parent_block_id: op.parent_block_id,
        normalizeOrders: op.normalizeOrders,
        transactionUpdates: op.transactionUpdates?.map((patch) => ({
          id: patch.id,
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.content !== undefined ? { content: patch.content } : {}),
          ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
          ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
          ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
          ...(patch.expected_version !== undefined ? { expected_version: patch.expected_version } : {}),
        })),
      },
    }];
  }
  case 'blockTransaction': {
    if (op.patches.length === 0 && op.deleteIds.length === 0) return [];
    return [{
      clientOpId: newClientOpId(),
      opType: 'block_transaction',
      payload: {
        opType: 'block_transaction',
        patches: op.patches.map((patch) => ({
          id: patch.id,
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.content !== undefined ? { content: patch.content } : {}),
          ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
          ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
          ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
          ...(patch.expected_version !== undefined ? { expected_version: patch.expected_version } : {}),
        })),
        deleteIds: op.deleteIds,
      },
    }];
  }
  case 'purgeBlock': {
    return [{
      clientOpId: newClientOpId(),
      opType: 'purge_block',
      payload: { opType: 'purge_block', id: op.id },
    }];
  }
  default: {
    const _exhaustive: never = op;
    return _exhaustive;
  }
  }
}

export function coalescePushItems(items: NoteBlockOpPushItem[]): NoteBlockOpPushItem[] {
  const contentByBlock = new Map<string, NoteBlockOpPushItem>();
  const rest: NoteBlockOpPushItem[] = [];

  for (const item of items) {
    if (item.payload.opType === 'patch_content') {
      contentByBlock.set(item.payload.blockId, item);
      continue;
    }
    rest.push(item);
  }

  return [...contentByBlock.values(), ...rest];
}

export function pushItemOpType(item: NoteBlockOpPushItem): string {
  return noteBlockOpTypeFromPayload(item.payload);
}
