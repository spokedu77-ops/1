import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { noteBlockOpTypeFromPayload } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteLocalOutboundOp } from './noteLocalDb';
import { appendOutboundOps } from './noteLocalDb';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import { readAuthorityBlockText, contentHasMediaPresence, decideRegressiveContentOp } from './noteAuthority';
import {
  noteContentHasProtectableUserPayload,
  shouldIgnoreRegressiveContentPatch,
} from '@/app/lib/note/noteContentAuthority';
import { LOCAL_ONLY_BLOCK_GRACE_MS } from './noteBlockStateMerge';
import { sealPassiveIncomingBlock } from './noteDataIntegrity';
import type { NoteBlock } from './types';

/** open merge·선호 판정 — text 필드만 보면 title/html/body 편집이 서버에 덮인다 */
function readBlockText(block: NoteBlock): string {
  return readAuthorityBlockText(block.content);
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

function mergeServerBlockIntoLocal(
  local: NoteBlock,
  server: NoteBlock,
  preferServerStructure = false,
): NoteBlock {
  if (preferServerStructure) {
    // open #6: topology outbound 없을 때만 서버 형제 순서·골격 채택
    return sealPassiveIncomingBlock(local, server);
  }
  if (shouldPreferServerBlockOverLocal(local, server)) {
    // 본문/버전만 서버 — order/parent는 로컬 유지 (content 갱신으로 체크리스트 춤 금지)
    const sealed = sealPassiveIncomingBlock(local, server);
    return {
      ...sealed,
      document_id: local.document_id,
      parent_block_id: local.parent_block_id ?? null,
      type: local.type,
      order_index: local.order_index,
    };
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

export type OutboundLeaveStripPlan = {
  /** leave id가 비어 통째로 지울 op */
  removeClientOpIds: string[];
  /** 형제 leave·companion patch를 남기고 restored id만 뺀 op */
  rewriteOps: NoteLocalOutboundOp[];
};

/**
 * intentional restore 전 — 미ack leave에서 restored id만 strip.
 * 멀티 soft_delete/txn deleteIds를 통삭제하면 형제 leave·order patch까지 소멸한다.
 */
export function planStripOutboundLeavesForRestoredIds(
  outbound: ReadonlyArray<NoteLocalOutboundOp>,
  blockIds: ReadonlySet<string>,
): OutboundLeaveStripPlan {
  const removeClientOpIds: string[] = [];
  const rewriteOps: NoteLocalOutboundOp[] = [];
  if (blockIds.size === 0) return { removeClientOpIds, rewriteOps };

  for (const op of outbound) {
    const payload = op.payload;
    if (payload.opType === 'soft_delete') {
      if (!payload.ids.some((id) => blockIds.has(id))) continue;
      const ids = payload.ids.filter((id) => !blockIds.has(id));
      if (ids.length === 0) {
        removeClientOpIds.push(op.clientOpId);
        continue;
      }
      const deleteMeta = payload.deleteMeta?.filter((meta) => !blockIds.has(meta.id));
      rewriteOps.push({
        ...op,
        payload: {
          opType: 'soft_delete',
          ids,
          ...(deleteMeta && deleteMeta.length > 0 ? { deleteMeta } : {}),
        },
      });
      continue;
    }
    if (payload.opType === 'block_transaction') {
      if (!payload.deleteIds.some((id) => blockIds.has(id))) continue;
      const deleteIds = payload.deleteIds.filter((id) => !blockIds.has(id));
      const deleteMeta = payload.deleteMeta?.filter((meta) => !blockIds.has(meta.id));
      const creates = payload.creates ?? [];
      const emptyTxn = deleteIds.length === 0
        && payload.patches.length === 0
        && creates.length === 0;
      if (emptyTxn) {
        removeClientOpIds.push(op.clientOpId);
        continue;
      }
      rewriteOps.push({
        ...op,
        payload: {
          opType: 'block_transaction',
          patches: payload.patches,
          deleteIds,
          ...(deleteMeta && deleteMeta.length > 0 ? { deleteMeta } : {}),
          ...(creates.length > 0 ? { creates } : {}),
        },
      });
    }
  }
  return { removeClientOpIds, rewriteOps };
}

/** @deprecated use planStripOutboundLeavesForRestoredIds — 통삭제 id만 필요할 때 */
export function collectOutboundLeaveClientOpIdsForBlockIds(
  outbound: ReadonlyArray<NoteLocalOutboundOp>,
  blockIds: ReadonlySet<string>,
): string[] {
  return planStripOutboundLeavesForRestoredIds(outbound, blockIds).removeClientOpIds;
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
  options?: {
    /**
     * 서버에 없는 로컬 id 폐기 (삭제 후 IDB 부활 차단).
     * 기본 true — outbound에 content만 있어도 prune 해야 한다.
     */
    pruneLocalOnlyNotOnServer?: boolean;
    /** 미ack create — 서버에 아직 없어도 유지 */
    protectLocalOnlyIds?: ReadonlySet<string>;
    /**
     * 미ack topology가 없을 때 서버 order/parent·형제 순서를 따름.
     * 본문은 seal로 보호.
     */
    preferServerStructure?: boolean;
  },
): NoteBlock[] {
  const prune = options?.pruneLocalOnlyNotOnServer !== false;
  const preferServerStructure = options?.preferServerStructure === true;
  const protectLocalOnlyIds = options?.protectLocalOnlyIds ?? new Set<string>();

  // soft-delete 대기 id는 로컬 스냅샷에서도 즉시 제거 — 서버 skip만으로는 IDB 부활을 못 막음
  const keptLocal = localBlocks.filter((block) => !pendingDeleteIds.has(block.id));
  const byId = new Map(keptLocal.map((block) => [block.id, block]));
  const order = keptLocal.map((block) => block.id);

  for (const serverBlock of serverBlocks) {
    if (pendingDeleteIds.has(serverBlock.id)) continue;
    const local = byId.get(serverBlock.id);
    if (!local) {
      byId.set(serverBlock.id, serverBlock);
      order.push(serverBlock.id);
      continue;
    }
    const nextBlock = mergeServerBlockIntoLocal(local, serverBlock, preferServerStructure);
    if (nextBlock === local) continue;
    byId.set(serverBlock.id, nextBlock);
  }

  let merged = order
    .map((id) => byId.get(id))
    .filter((block): block is NoteBlock => Boolean(block));

  if (prune) {
    const serverIds = new Set(serverBlocks.map((block) => block.id));
    const now = Date.now();
    merged = merged.filter((block) => {
      if (serverIds.has(block.id)) return true;
      if (protectLocalOnlyIds.has(block.id)) return true;
      if (!block.created_at) return false;
      const createdAt = new Date(block.created_at).getTime();
      if (!Number.isFinite(createdAt)) return false;
      return now - createdAt <= LOCAL_ONLY_BLOCK_GRACE_MS;
    });
  }

  if (preferServerStructure) {
    const serverIds = serverBlocks
      .filter((block) => !pendingDeleteIds.has(block.id))
      .map((block) => block.id);
    const mergedById = new Map(merged.map((block) => [block.id, block]));
    const serverOrdered = serverIds
      .map((id) => mergedById.get(id))
      .filter((block): block is NoteBlock => Boolean(block));
    const localOnly = merged.filter((block) => !serverIds.includes(block.id));
    merged = [...serverOrdered, ...localOnly];
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
    const blockById = new Map((op.blocks ?? []).map((block) => [block.id, block]));
    return [{
      clientOpId: newClientOpId(),
      opType: 'soft_delete',
      payload: {
        opType: 'soft_delete',
        ids: op.ids,
        deleteMeta: op.ids.map((id) => ({
          id,
          updated_at: blockById.get(id)?.updated_at ?? null,
        })),
      },
    }];
  }
  case 'createBlock': {
    if (!op.id) {
      throw new Error('[Note] createBlock requires client id before op-log push');
    }
    const transactionUpdates: NoteBlockFieldPatch[] = [
      ...(op.normalizeOrders ?? []).map((patch) => ({
        id: patch.id,
        order_index: patch.order_index,
      })),
      ...(op.transactionUpdates ?? []),
    ];
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
        transactionUpdates: transactionUpdates.length > 0 ? transactionUpdates.map((patch) => ({
          id: patch.id,
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.content !== undefined ? { content: patch.content } : {}),
          ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
          ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
          ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
          ...(patch.expected_version !== undefined ? { expected_version: patch.expected_version } : {}),
        })) : undefined,
      },
    }];
  }
  case 'blockTransaction': {
    if (op.patches.length === 0 && op.deleteIds.length === 0 && (!op.creates || op.creates.length === 0)) return [];
    const deletedBlockById = new Map((op.deletedBlocks ?? []).map((block) => [block.id, block]));
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
        ...(op.deleteIds.length > 0
          ? {
            deleteMeta: op.deleteIds.map((id) => ({
              id,
              updated_at: deletedBlockById.get(id)?.updated_at ?? null,
            })),
          }
          : {}),
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
 * ZERO LOSS: protectable patch_content는 drop_stale로 outbound에서 지우지 않는다.
 * stale base → outbound Intent 유지 + base를 서버로.
 * store-ahead(truncate patch) → 화면 본문으로 content 교체.
 */
export function filterRegressivePatchContentOps(
  ops: NoteBlockOpPushItem[],
  blocks: NoteBlock[],
  serverBlocks: NoteBlock[] = [],
): { safeReady: NoteBlockOpPushItem[]; dropStaleIds: string[]; rebasedOps: NoteBlockOpPushItem[] } {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const serverById = new Map(serverBlocks.map((block) => [block.id, block]));
  const safeReady: NoteBlockOpPushItem[] = [];
  const dropStaleIds: string[] = [];
  const rebasedOps: NoteBlockOpPushItem[] = [];

  for (const op of ops) {
    if (op.opType !== 'patch_content') {
      safeReady.push(op);
      continue;
    }
    const payload = op.payload;
    if (payload.opType !== 'patch_content') {
      safeReady.push(op);
      continue;
    }
    const block = blocksById.get(payload.blockId);
    if (!block) {
      safeReady.push(op);
      continue;
    }

    const localContent = (block.content ?? {}) as Record<string, unknown>;
    const patchContent = payload.content;
    const localText = readAuthorityBlockText(localContent);
    const patchText = readAuthorityBlockText(patchContent);
    const decision = decideRegressiveContentOp({
      localText,
      patchText,
      localHasMediaPresence: contentHasMediaPresence(localContent),
      patchHasMediaPresence: contentHasMediaPresence(patchContent),
    });
    const ignore = shouldIgnoreRegressiveContentPatch(
      localContent,
      patchContent,
      payload.baseContent,
    );

    if (decision !== 'drop_stale' && !ignore) {
      safeReady.push(op);
      continue;
    }

    const protectable = noteContentHasProtectableUserPayload(localContent)
      || noteContentHasProtectableUserPayload(patchContent);
    if (!protectable) {
      dropStaleIds.push(op.clientOpId);
      continue;
    }

    const serverContent = serverById.get(payload.blockId)?.content;
    const nextContent = decision === 'drop_stale'
      ? { ...localContent }
      : (localText.length > patchText.length ? { ...localContent } : { ...patchContent });
    const nextBase = (
      serverContent && typeof serverContent === 'object'
        ? { ...(serverContent as Record<string, unknown>) }
        : (typeof block.content === 'object' && block.content
          ? { ...(block.content as Record<string, unknown>) }
          : payload.baseContent)
    );
    const rebased: NoteBlockOpPushItem = {
      ...op,
      payload: {
        ...payload,
        content: nextContent,
        ...(nextBase ? { baseContent: nextBase } : {}),
      },
    };
    safeReady.push(rebased);
    rebasedOps.push(rebased);
  }
  return { safeReady, dropStaleIds, rebasedOps };
}

/**
 * 미ack patch_content를 로컬 블록에 Intent로 덮는다.
 * 새로고침·IDB stale 시에도 outbound 편집본이 first-paint에 살아야 한다 (ZERO LOSS).
 */
export function applyOutboundContentPatchesToBlocks(
  blocks: NoteBlock[],
  outbound: ReadonlyArray<Pick<NoteLocalOutboundOp, 'payload'>>,
): NoteBlock[] {
  if (outbound.length === 0) return blocks;
  const coalesced = coalescePushItems(
    outbound.map(({ payload, ...rest }) => {
      void rest;
      return { clientOpId: 'overlay', opType: 'patch_content' as const, payload };
    }),
  );
  const latestByBlock = new Map<string, Record<string, unknown>>();
  for (const item of coalesced) {
    if (item.payload.opType !== 'patch_content') continue;
    latestByBlock.set(item.payload.blockId, item.payload.content);
  }
  if (latestByBlock.size === 0) return blocks;
  return blocks.map((block) => {
    const patch = latestByBlock.get(block.id);
    if (!patch) return block;
    const prev = (block.content ?? {}) as Record<string, unknown>;
    return {
      ...block,
      content: { ...prev, ...patch },
    };
  });
}

/**
 * stale base로 server reject된 patch_content — baseContent를 서버 스냅샷으로 맞춰 재시도 가능하게.
 */
export async function rewriteOutboundPatchContentBases(
  documentId: string,
  outbound: ReadonlyArray<NoteLocalOutboundOp>,
  serverBlocks: ReadonlyArray<NoteBlock>,
): Promise<void> {
  if (outbound.length === 0 || serverBlocks.length === 0) return;
  const serverById = new Map(serverBlocks.map((block) => [block.id, block]));
  const rewrites: NoteBlockOpPushItem[] = [];
  for (const row of outbound) {
    if (row.payload.opType !== 'patch_content') continue;
    const server = serverById.get(row.payload.blockId);
    if (!server?.content || typeof server.content !== 'object') continue;
    rewrites.push({
      clientOpId: row.clientOpId,
      opType: 'patch_content',
      payload: {
        ...row.payload,
        baseContent: { ...(server.content as Record<string, unknown>) },
      },
    });
  }
  if (rewrites.length === 0) return;
  await appendOutboundOps(documentId, rewrites);
}

export function coalescePushItems(items: NoteBlockOpPushItem[]): NoteBlockOpPushItem[] {
  const latestContentIndexByBlock = new Map<string, number>();
  const earliestBaseByBlock = new Map<string, Record<string, unknown> | undefined>();
  items.forEach((item, index) => {
    if (item.payload.opType !== 'patch_content') return;
    const blockId = item.payload.blockId;
    if (!earliestBaseByBlock.has(blockId)) {
      earliestBaseByBlock.set(blockId, item.payload.baseContent);
    }
    latestContentIndexByBlock.set(blockId, index);
  });

  const result: NoteBlockOpPushItem[] = [];
  items.forEach((item, index) => {
    if (item.payload.opType === 'patch_content') {
      if (latestContentIndexByBlock.get(item.payload.blockId) !== index) return;
      const earliestBase = earliestBaseByBlock.get(item.payload.blockId);
      const payload = { ...item.payload };
      if (earliestBase !== undefined) {
        payload.baseContent = earliestBase;
      } else {
        delete payload.baseContent;
      }
      result.push({ ...item, payload });
      return;
    }
    result.push(item);
  });
  return result;
}

export function pushItemOpType(item: NoteBlockOpPushItem): string {
  return noteBlockOpTypeFromPayload(item.payload);
}
