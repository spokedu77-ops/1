import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { noteBlockOpTypeFromPayload } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteLocalOutboundOp } from './noteLocalDb';
import type { NoteBlock } from './types';

function newClientOpId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** IndexedDB outbound 큐에 아직 push되지 않은 soft delete id */
export function collectPendingSoftDeleteIds(
  outbound: NoteLocalOutboundOp[],
): Set<string> {
  const ids = new Set<string>();
  for (const op of outbound) {
    const payload = op.payload;
    if (payload.opType === 'soft_delete') {
      for (const id of payload.ids) ids.add(id);
      continue;
    }
    if (payload.opType === 'block_transaction') {
      for (const id of payload.deleteIds) ids.add(id);
    }
  }
  return ids;
}

/** outbound soft delete가 확정되기 전 서버 스냅샷·op replay가 블록을 되살리지 않도록 제거 */
export function excludeBlocksPendingSoftDelete(
  blocks: NoteBlock[],
  pendingDeleteIds: Set<string>,
): NoteBlock[] {
  if (pendingDeleteIds.size === 0) return blocks;
  return blocks.filter((block) => !pendingDeleteIds.has(block.id));
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
    if (!op.id) {
      throw new Error('[Note] createBlock requires client id before op-log push');
    }
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

/**
 * 같은 블록의 patch_content만 최신으로 합친다.
 * create → patch 등 상대 순서는 유지한다 (content를 앞으로 끌어올리면 block not found 발생).
 */
export function coalescePushItems(items: NoteBlockOpPushItem[]): NoteBlockOpPushItem[] {
  const latestContentIndexByBlock = new Map<string, number>();
  items.forEach((item, index) => {
    if (item.payload.opType === 'patch_content') {
      latestContentIndexByBlock.set(item.payload.blockId, index);
    }
  });

  const result: NoteBlockOpPushItem[] = [];
  items.forEach((item, index) => {
    if (item.payload.opType === 'patch_content') {
      if (latestContentIndexByBlock.get(item.payload.blockId) !== index) return;
    }
    result.push(item);
  });
  return result;
}

export function pushItemOpType(item: NoteBlockOpPushItem): string {
  return noteBlockOpTypeFromPayload(item.payload);
}
