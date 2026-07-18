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

function readBlockVersion(block: NoteBlock): number {
  return typeof block.version === 'number' && Number.isFinite(block.version)
    ? block.version
    : 1;
}

function readBlockUpdatedAtMs(block: NoteBlock): number {
  const ms = Date.parse(block.updated_at ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

function stableContentFingerprint(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableContentFingerprint(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableContentFingerprint(record[key])}`)
    .join(',')}}`;
}

function blockContentChanged(local: NoteBlock, server: NoteBlock): boolean {
  return stableContentFingerprint(local.content ?? null)
    !== stableContentFingerprint(server.content ?? null);
}

function shouldPreferServerBlockOverLocal(local: NoteBlock, server: NoteBlock): boolean {
  const localText = readBlockText(local);
  const serverText = readBlockText(server);
  const localTextAhead = localText.length > serverText.length;

  if (local.type === 'text' && server.type === 'text') {
    if (localTextAhead) return false;
    if (!localText && !!serverText) return true;
  }
  if (local.type === 'image' && server.type === 'image') {
    return !readBlockImageUrl(local) && !!readBlockImageUrl(server);
  }
  if (!blockContentChanged(local, server)) return false;
  if (localTextAhead) return false;

  const localVersion = readBlockVersion(local);
  const serverVersion = readBlockVersion(server);
  if (serverVersion > localVersion) return true;
  if (serverVersion < localVersion) return false;

  return readBlockUpdatedAtMs(server) > readBlockUpdatedAtMs(local);
}

function mergeServerMetadata(local: NoteBlock, server: NoteBlock): NoteBlock {
  if (server === local) return local;
  const serverVersion = readBlockVersion(server);
  const localVersion = readBlockVersion(local);
  const serverUpdatedAt = readBlockUpdatedAtMs(server);
  const localUpdatedAt = readBlockUpdatedAtMs(local);
  if (serverVersion < localVersion) return local;
  if (serverVersion === localVersion && serverUpdatedAt <= localUpdatedAt) return local;
  return {
    ...local,
    version: server.version,
    updated_at: server.updated_at,
  };
}

function mergeServerBlockIntoLocal(local: NoteBlock, server: NoteBlock): NoteBlock {
  if (shouldPreferServerBlockOverLocal(local, server)) {
    return server;
  }
  if (
    local.type !== server.type
    || local.order_index !== server.order_index
    || (local.parent_block_id ?? null) !== (server.parent_block_id ?? null)
    || local.document_id !== server.document_id
  ) {
    return local;
  }
  return mergeServerMetadata(local, server);
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
 * outbound에 document_id 이전(patch)이 아직 push되지 않았을 때,
 * 출발 문서 sync가 서버 스냅샷으로 블록을 되살리지 않도록 id 수집.
 */
export function collectPendingTransferAwayIds(
  outbound: NoteLocalOutboundOp[],
  documentId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const op of outbound) {
    const payload = op.payload;
    if (payload.opType === 'patch_fields') {
      for (const patch of payload.patches) {
        if (typeof patch.document_id === 'string' && patch.document_id !== documentId) {
          ids.add(patch.id);
        }
      }
      continue;
    }
    if (payload.opType === 'block_transaction') {
      for (const patch of payload.patches) {
        if (typeof patch.document_id === 'string' && patch.document_id !== documentId) {
          ids.add(patch.id);
        }
      }
    }
  }
  return ids;
}

/** soft delete + 타 문서로의 이동 등 outbound 확정 전 되살림 방지 id */
export function collectPendingOutboundExcludedIds(
  outbound: NoteLocalOutboundOp[],
  documentId: string,
): Set<string> {
  return new Set([
    ...collectPendingSoftDeleteIds(outbound),
    ...collectPendingTransferAwayIds(outbound, documentId),
  ]);
}

/**
 * blocks/load에 id가 남아 있다고 pending soft delete를 stale로 보지 않는다.
 * push 전에는 서버에 블록이 있는 것이 정상이며, 확정은 outbound 소비(push ack)로만 처리한다.
 */
export function filterStalePendingSoftDeletes(
  serverBlocks: NoteBlock[],
  pendingDeleteIds: Set<string>,
): Set<string> {
  void serverBlocks;
  return pendingDeleteIds;
}

/**
 * @deprecated blocks/load 존재만으로 outbound soft delete를 폐기하지 않는다 (push 전 정상 상태).
 */
export function findOutboundOpsSupersededByServerRestore(
  outbound: NoteLocalOutboundOp[],
  serverBlocks: NoteBlock[],
): string[] {
  void outbound;
  void serverBlocks;
  return [];
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
    const nextBlock = mergeServerBlockIntoLocal(local, serverBlock);
    if (nextBlock === local) continue;
    merged = merged.map((block) => (block.id === serverBlock.id ? nextBlock : block));
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
        ...(update.baseContent ? { baseContent: update.baseContent } : {}),
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
    if (op.patches.length === 0 && op.deleteIds.length === 0 && (!op.creates || op.creates.length === 0)) return [];
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
        ...(op.creates ? { creates: op.creates } : {}),
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
