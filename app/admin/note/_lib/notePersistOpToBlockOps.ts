import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { noteBlockOpTypeFromPayload } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteLocalOutboundOp } from './noteLocalDb';
import type { NoteBlock } from './types';

function readBlockText(block: NoteBlock): string {
  const text = block.content?.text;
  return typeof text === 'string' ? text.trim() : '';
}

function readBlockImageUrl(block: NoteBlock): string {
  const url = block.content?.url;
  return typeof url === 'string' ? url.trim() : '';
}

function shouldPreferServerBlockOverLocal(local: NoteBlock, server: NoteBlock): boolean {
  if (local.type === 'text' && server.type === 'text') {
    return !readBlockText(local) && !!readBlockText(server);
  }
  if (local.type === 'image' && server.type === 'image') {
    return !readBlockImageUrl(local) && !!readBlockImageUrl(server);
  }
  return false;
}

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

/**
 * IndexedDB local.blocks가 []일 때 outbound만으로 빈 로컬을 신뢰할지.
 * pending soft delete가 서버 블록 전부를 설명할 때만 true — 그 외는 오염된 로컬로 보고 서버 rebase.
 */
export function shouldTrustEmptyLocalWithOutbound(
  outbound: NoteLocalOutboundOp[],
  serverBlocks: NoteBlock[],
): boolean {
  if (serverBlocks.length === 0) return true;
  const pendingDeletes = collectPendingSoftDeleteIds(outbound);
  return serverBlocks.every((block) => pendingDeletes.has(block.id));
}

/** 서버 load에만 있는 블록·빈 로컬 placeholder를 서버로 보강 — DB 직접 복구 후 IDB stale 방지 */
export function mergeServerBlocksIntoLocalSnapshot(
  localBlocks: NoteBlock[],
  serverBlocks: NoteBlock[],
  pendingDeleteIds: Set<string>,
): NoteBlock[] {
  const localById = new Map(localBlocks.map((block) => [block.id, block]));
  let merged = [...localBlocks];

  for (const serverBlock of serverBlocks) {
    if (pendingDeleteIds.has(serverBlock.id)) continue;
    const local = localById.get(serverBlock.id);
    if (!local) {
      merged.push(serverBlock);
      continue;
    }
    if (!shouldPreferServerBlockOverLocal(local, serverBlock)) continue;
    merged = merged.map((block) => (block.id === serverBlock.id ? serverBlock : block));
  }

  return dedupeNoteBlocksById(merged);
}

export function serverSnapshotHasBlocksMissingFrom(
  current: NoteBlock[],
  server: NoteBlock[],
): boolean {
  if (server.length > current.length) return true;
  const currentById = new Map(current.map((block) => [block.id, block]));
  for (const serverBlock of server) {
    const local = currentById.get(serverBlock.id);
    if (!local) return true;
    if (shouldPreferServerBlockOverLocal(local, serverBlock)) return true;
  }
  return false;
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
