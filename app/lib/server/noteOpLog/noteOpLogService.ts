import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NoteBlockOpPayload,
  NoteBlockOpPushItem,
  NoteBlockOpRecord,
  NoteBlockSnapshot,
} from '@/app/lib/note/noteBlockOpTypes';
import {
  noteContentHasStructuredPresence,
  shouldIgnoreRegressiveContentPatch,
} from '@/app/lib/note/noteContentAuthority';
import { commitNoteBlockOp } from '@/app/lib/server/noteOpLog/noteCommitBlockOp';
import { sanitizeNoteBlockTree, type SanitizableNoteBlock } from '@/app/lib/note/noteBlockSanitize';
import { mergeMemoPadTransactionPatchFromSanitize } from '@/app/lib/note/noteMemoPadContract';

export { shouldIgnoreRegressiveContentPatch } from '@/app/lib/note/noteContentAuthority';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

function toSnapshot(row: Record<string, unknown>): NoteBlockSnapshot {
  return {
    id: String(row.id),
    document_id: String(row.document_id),
    parent_block_id: row.parent_block_id == null ? null : String(row.parent_block_id),
    type: String(row.type ?? 'text'),
    order_index: typeof row.order_index === 'number' ? row.order_index : 0,
    content: (row.content as Record<string, unknown> | null) ?? null,
    version: typeof row.version === 'number' ? row.version : 1,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
}

function stripExpectedVersion<T extends { expected_version?: number }>(patch: T): Omit<T, 'expected_version'> {
  const next = { ...patch };
  delete next.expected_version;
  return next;
}

type TransactionLikePatch = {
  id: string;
  document_id?: string;
  parent_block_id?: string | null;
  type?: string;
  order_index?: number;
  content?: unknown;
};

type TransactionLikeCreate = {
  id?: string;
  document_id?: string;
  parent_block_id?: string | null;
  type?: string;
  order_index?: number;
  content?: unknown;
};

type OpSanitizableBlock = SanitizableNoteBlock & {
  document_id: string;
  deleted_at?: string | null;
  version?: number;
};

export function normalizeOpTransactionPayloadForInvariants({
  existingBlocks,
  updates,
  creates,
  deleteIds,
  documentId,
}: {
  existingBlocks: OpSanitizableBlock[];
  updates: TransactionLikePatch[];
  creates: TransactionLikeCreate[];
  deleteIds: string[];
  documentId: string;
}): { updates: TransactionLikePatch[]; creates: TransactionLikeCreate[] } {
  const deleted = new Set(deleteIds);
  const updateById = new Map(updates.map((patch) => [patch.id, patch]));
  const projectedExisting = existingBlocks
    .filter((block) => !block.deleted_at && !deleted.has(block.id))
    .map((block) => {
      const update = updateById.get(block.id);
      return {
        ...block,
        document_id: update?.document_id ?? block.document_id,
        parent_block_id: update && 'parent_block_id' in update ? update.parent_block_id ?? null : block.parent_block_id ?? null,
        type: update?.type ?? block.type,
        order_index: typeof update?.order_index === 'number' ? update.order_index : block.order_index,
        content: update?.content !== undefined ? update.content as Record<string, unknown> : block.content,
      };
    });
  const projectedCreates = creates
    .filter((create): create is TransactionLikeCreate & { id: string } => typeof create.id === 'string')
    .map((create) => ({
      id: create.id,
      document_id: create.document_id ?? documentId,
      parent_block_id: create.parent_block_id ?? null,
      type: create.type ?? 'text',
      order_index: typeof create.order_index === 'number' ? create.order_index : 0,
      content: (create.content ?? {}) as Record<string, unknown>,
    }));
  const sanitized = sanitizeNoteBlockTree([...projectedExisting, ...projectedCreates]);
  const sanitizedById = new Map(sanitized.map((block) => [block.id, block]));

  return {
    updates: updates.map((patch) => {
      const block = sanitizedById.get(patch.id);
      if (!block) return patch;
      return mergeMemoPadTransactionPatchFromSanitize(patch, block);
    }),
    creates: creates.map((create) => {
      if (!create.id) return create;
      const block = sanitizedById.get(create.id);
      if (!block) return create;
      return mergeMemoPadTransactionPatchFromSanitize(create, block);
    }),
  };
}

async function normalizeRpcTransactionPayload(
  supabase: SupabaseClient,
  documentId: string,
  updates: TransactionLikePatch[],
  creates: TransactionLikeCreate[],
  deleteIds: string[],
): Promise<{ updates: TransactionLikePatch[]; creates: TransactionLikeCreate[] }> {
  const rows = await fetchActiveDocumentBlocks(supabase, documentId);
  const knownIds = new Set(rows.map((row) => row.id));
  const companionIds = [
    ...new Set(
      updates
        .map((patch) => patch.id)
        .filter((id) => Boolean(id) && !knownIds.has(id)),
    ),
  ];
  if (companionIds.length > 0) {
    const { data, error } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .in('id', companionIds)
      .is('deleted_at', null);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as OpSanitizableBlock[]));
  }
  return normalizeOpTransactionPayloadForInvariants({
    existingBlocks: rows,
    updates,
    creates,
    deleteIds,
    documentId,
  });
}

async function fetchActiveDocumentBlocks(
  supabase: SupabaseClient,
  documentId: string,
): Promise<OpSanitizableBlock[]> {
  const rows: OpSanitizableBlock[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as OpSanitizableBlock[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function hasStructuredContent(content: unknown): boolean {
  return noteContentHasStructuredPresence(content);
}

function isTopologyOnlyPatch(patch: TransactionLikePatch): boolean {
  return patch.type !== undefined
    || typeof patch.order_index === 'number'
    || 'parent_block_id' in patch
    || typeof patch.document_id === 'string';
}

/**
 * patch_fields / transaction 의 content는 baseContent 없이 올 수 있다.
 * 공유 authority로 regressive content를 제거해 topology만 남긴다 (predicate 우회 금지).
 */
export async function stripRegressiveContentFromPatches<T extends TransactionLikePatch>(
  supabase: SupabaseClient,
  documentId: string,
  patches: T[],
): Promise<T[]> {
  const out: T[] = [];
  for (const patch of patches) {
    if (patch.content === undefined) {
      out.push(patch);
      continue;
    }
    const { data: current } = await supabase
      .from('note_blocks')
      .select('content')
      .eq('id', patch.id)
      .eq('document_id', documentId)
      .maybeSingle();
    if (!current) {
      if (isTopologyOnlyPatch(patch)) {
        const { content: _dropped, ...topology } = patch;
        void _dropped;
        out.push(topology as T);
      }
      continue;
    }
    if (shouldIgnoreRegressiveContentPatch(current.content, patch.content)) {
      if (isTopologyOnlyPatch(patch)) {
        const { content: _dropped, ...topology } = patch;
        void _dropped;
        out.push(topology as T);
      }
      continue;
    }
    out.push(patch);
  }
  return out;
}

function softDeleteMetaMatches(
  row: Record<string, unknown>,
  deleteMeta: Array<{ id: string; updated_at?: string | null }> | undefined,
): boolean {
  const id = String(row.id);
  const meta = deleteMeta?.find((item) => item.id === id);
  // meta 행이 없으면(레거시/실수 wipe) 빈 블록만 삭제
  if (!meta) {
    return !hasStructuredContent(row.content);
  }
  // deleteMeta에 id가 있으면 intentional soft-delete.
  // updated_at null/''여도 skip+ack로 좀비를 만들지 않는다.
  return true;
}

/**
 * 아직 살아있는 요청 id만 고른다. meta 없는 structured는 제외.
 * 이미 삭제된 id는 멱등 성공으로 취급(목록에 넣지 않음).
 */
export function resolveIntentSoftDeleteIds(options: {
  requestedIds: ReadonlyArray<string>;
  rows: ReadonlyArray<Record<string, unknown>>;
  deleteMeta?: Array<{ id: string; updated_at?: string | null }>;
}): string[] {
  const requested = new Set(options.requestedIds.map(String));
  return options.rows
    .filter((row) => requested.has(String(row.id)))
    .filter((row) => !row.deleted_at)
    .filter((row) => softDeleteMetaMatches(row, options.deleteMeta))
    .map((row) => String(row.id));
}

/** 요청 id 중 살아 있는데 삭제 대상에서 빠진 것이 있으면 ack 금지 */
export function assertSoftDeleteFullyApplied(options: {
  requestedIds: ReadonlyArray<string>;
  rows: ReadonlyArray<Record<string, unknown>>;
  appliedIds: ReadonlyArray<string>;
}): void {
  const requested = new Set(options.requestedIds.map(String));
  const applied = new Set(options.appliedIds.map(String));
  const blocked = options.rows
    .filter((row) => requested.has(String(row.id)))
    .filter((row) => !row.deleted_at)
    .map((row) => String(row.id))
    .filter((id) => !applied.has(id));
  if (blocked.length > 0) {
    throw new Error(`soft_delete_not_applied:${blocked.join(',')}`);
  }
}

function isLeaveMaterializePayload(payload: NoteBlockOpPayload): boolean {
  if (payload.opType === 'soft_delete' || payload.opType === 'purge_block') return true;
  if (payload.opType === 'block_transaction') return payload.deleteIds.length > 0;
  return false;
}

async function filterSoftDeleteIdsByMeta(
  supabase: SupabaseClient,
  documentId: string,
  ids: string[],
  deleteMeta: Array<{ id: string; updated_at?: string | null }> | undefined,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .in('id', ids)
    .eq('document_id', documentId);
  if (error) throw new Error(error.message);
  return resolveIntentSoftDeleteIds({
    requestedIds: ids,
    rows: (data ?? []) as Array<Record<string, unknown>>,
    deleteMeta,
  });
}

export function filterTransactionPatchesByExistingIds<T extends { id: string }>(
  patches: T[],
  existingIds: ReadonlySet<string>,
): T[] {
  return patches.filter((patch) => existingIds.has(patch.id));
}

export function filterTransactionPatchesByDocument<T extends {
  id: string;
  document_id?: string;
  order_index?: number;
}>(
  patches: T[],
  blockDocumentById: ReadonlyMap<string, string>,
  documentId: string,
): T[] {
  // 이 stream에서 나가는 transfer의 타깃 document_id 집합
  const outboundTargets = new Set<string>();
  for (const patch of patches) {
    const current = blockDocumentById.get(patch.id);
    if (
      current === documentId
      && typeof patch.document_id === 'string'
      && patch.document_id !== documentId
    ) {
      outboundTargets.add(patch.document_id);
    }
  }

  return patches.filter((patch) => {
    const current = blockDocumentById.get(patch.id);
    // 현재 이 stream 소유
    if (current === documentId) return true;
    // reclaim: 다른 문서 → 이 stream으로 document_id 복귀
    if (patch.document_id === documentId) return true;
    // C5 companion: transfer 타깃의 기존 root order shift (document_id 필드 없음)
    if (
      current
      && outboundTargets.has(current)
      && patch.document_id === undefined
      && typeof patch.order_index === 'number'
    ) {
      return true;
    }
    return false;
  });
}

async function filterExistingTransactionPatches<T extends { id: string; document_id?: string }>(
  supabase: SupabaseClient,
  documentId: string,
  patches: T[],
): Promise<T[]> {
  if (patches.length === 0) return patches;
  const ids = [...new Set(patches.map((patch) => patch.id).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('note_blocks')
    .select('id,document_id')
    .in('id', ids);
  if (error) throw new Error(error.message);
  const blockDocumentById = new Map(
    (data ?? []).map((row) => [String(row.id), String(row.document_id)]),
  );
  return filterTransactionPatchesByDocument(patches, blockDocumentById, documentId);
}

export async function getNoteDocumentSyncState(
  supabase: SupabaseClient,
  documentId: string,
): Promise<{ lastSeq: number }> {
  const { data, error } = await supabase
    .from('note_document_sync_state')
    .select('last_seq')
    .eq('document_id', documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { error: insertError } = await supabase
      .from('note_document_sync_state')
      .insert({ document_id: documentId, last_seq: 0 });
    if (insertError && !insertError.message.includes('duplicate')) {
      throw new Error(insertError.message);
    }
    return { lastSeq: 0 };
  }

  const syncLastSeq = typeof data.last_seq === 'number' ? data.last_seq : Number(data.last_seq) || 0;

  // Self-heal: sync_state가 insert 실패 등으로 ops.max(seq)보다 앞서 있을 수 있다.
  const { data: maxRow, error: maxError } = await supabase
    .from('note_block_ops')
    .select('seq')
    .eq('document_id', documentId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw new Error(maxError.message);
  const opsMaxSeq = maxRow?.seq == null
    ? 0
    : (typeof maxRow.seq === 'number' ? maxRow.seq : Number(maxRow.seq) || 0);

  const effectiveLastSeq = Math.max(syncLastSeq, opsMaxSeq);
  if (effectiveLastSeq !== syncLastSeq) {
    await supabase
      .from('note_document_sync_state')
      .update({ last_seq: effectiveLastSeq, updated_at: new Date().toISOString() })
      .eq('document_id', documentId);
  }

  return { lastSeq: effectiveLastSeq };
}

export async function pullNoteBlockOps(
  supabase: SupabaseClient,
  documentId: string,
  sinceSeq: number,
  limit = 500,
): Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }> {
  const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
  const { data, error } = await supabase
    .from('note_block_ops')
    .select('seq, client_op_id, op_type, payload, actor_id, created_at')
    .eq('document_id', documentId)
    .gt('seq', sinceSeq)
    .order('seq', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const ops: NoteBlockOpRecord[] = (data ?? []).map((row) => ({
    seq: typeof row.seq === 'number' ? row.seq : Number(row.seq),
    clientOpId: String(row.client_op_id),
    opType: row.op_type as NoteBlockOpRecord['opType'],
    payload: row.payload as NoteBlockOpPayload,
    actorId: row.actor_id == null ? null : String(row.actor_id),
    createdAt: String(row.created_at),
  }));

  return { lastSeq, ops };
}

export async function applyNoteBlockOpPayload(
  supabase: SupabaseClient,
  documentId: string,
  payload: NoteBlockOpPayload,
  actorId: string,
): Promise<NoteBlockSnapshot[]> {
  const now = new Date().toISOString();

  switch (payload.opType) {
  case 'patch_content': {
    const { data: current } = await supabase
      .from('note_blocks')
      .select('version, content')
      .eq('id', payload.blockId)
      .eq('document_id', documentId)
      .maybeSingle();
    if (!current) return [];
    if (shouldIgnoreRegressiveContentPatch(current.content, payload.content, payload.baseContent)) {
      return [];
    }
    const nextVersion = (typeof current?.version === 'number' ? current.version : 1) + 1;
    const { data: updated, error: patchError } = await supabase
      .from('note_blocks')
      .update({
        content: payload.content,
        updated_at: now,
        updated_by: actorId,
        version: nextVersion,
      })
      .eq('id', payload.blockId)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .select(BLOCK_SELECT)
      .maybeSingle();
    if (patchError) throw new Error(patchError.message);
    if (!updated) return [];
    return [toSnapshot(updated as Record<string, unknown>)];
  }
  case 'patch_fields': {
    const patches = await filterExistingTransactionPatches(
      supabase,
      documentId,
      payload.patches.map(stripExpectedVersion),
    );
    const safePatches = await stripRegressiveContentFromPatches(supabase, documentId, patches);
    if (safePatches.length === 0) return [];
    const normalized = await normalizeRpcTransactionPayload(supabase, documentId, safePatches, [], []);
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: normalized.updates,
      p_delete_ids: [],
      p_actor_id: actorId,
      p_creates: normalized.creates,
    });
    if (error) throw new Error(error.message);
    const result = data as { status?: string; blocks?: unknown[] };
    if (result?.status === 'conflict') {
      throw new Error('version_conflict during op apply');
    }
    return (result?.blocks ?? []).map((row) => toSnapshot(row as Record<string, unknown>));
  }
  case 'soft_delete': {
    if (payload.ids.length === 0) return [];
    const { data: beforeBlocks } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .in('id', payload.ids)
      .eq('document_id', documentId);
    const rows = (beforeBlocks ?? []) as Array<Record<string, unknown>>;
    const targetIds = resolveIntentSoftDeleteIds({
      requestedIds: payload.ids,
      rows,
      deleteMeta: payload.deleteMeta,
    });
    assertSoftDeleteFullyApplied({
      requestedIds: payload.ids,
      rows,
      appliedIds: targetIds,
    });
    const targetIdSet = new Set(targetIds);
    const targets = (beforeBlocks ?? []).filter((row) => targetIdSet.has(String(row.id)));
    const snapshots: NoteBlockSnapshot[] = [];
    for (const row of targets) {
      const version = (typeof row.version === 'number' ? row.version : 1) + 1;
      const { data: updated, error } = await supabase
        .from('note_blocks')
        .update({
          deleted_at: now,
          deleted_by: actorId,
          updated_at: now,
          updated_by: actorId,
          version,
        })
        .eq('id', row.id)
        .select(BLOCK_SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (updated) snapshots.push(toSnapshot(updated as Record<string, unknown>));
    }
    return snapshots;
  }
  case 'create_block': {
    const updates = await filterExistingTransactionPatches(supabase, documentId, [
      ...(payload.transactionUpdates ?? []).map(stripExpectedVersion),
    ]);
    const safeUpdates = await stripRegressiveContentFromPatches(supabase, documentId, updates);
    const creates = [{
      id: payload.id,
      document_id: payload.documentId,
      parent_block_id: payload.parent_block_id,
      type: payload.blockType,
      order_index: payload.order_index ?? 0,
      content: payload.content,
    }];
    const normalized = await normalizeRpcTransactionPayload(supabase, documentId, safeUpdates, creates, []);
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: normalized.updates,
      p_delete_ids: [],
      p_actor_id: actorId,
      p_creates: normalized.creates,
    });
    if (error) throw new Error(error.message);
    const result = data as {
      status?: string;
      blocks?: unknown[];
      created_blocks?: unknown[];
    };
    if (result?.status === 'conflict') {
      throw new Error('version_conflict during op apply');
    }
    const patched = (result?.blocks ?? []).map((row) => toSnapshot(row as Record<string, unknown>));
    const created = (result?.created_blocks ?? []).map((row) => toSnapshot(row as Record<string, unknown>));
    return [...patched, ...created];
  }
  case 'block_transaction': {
    const patches = await filterExistingTransactionPatches(
      supabase,
      documentId,
      payload.patches.map(stripExpectedVersion),
    );
    const safePatches = await stripRegressiveContentFromPatches(supabase, documentId, patches);
    const deleteIds = payload.deleteIds.length > 0
      ? await filterSoftDeleteIdsByMeta(supabase, documentId, payload.deleteIds, payload.deleteMeta)
      : [];
    if (payload.deleteIds.length > 0) {
      const { data: beforeDeleteRows, error: beforeDeleteError } = await supabase
        .from('note_blocks')
        .select(BLOCK_SELECT)
        .in('id', payload.deleteIds)
        .eq('document_id', documentId);
      if (beforeDeleteError) throw new Error(beforeDeleteError.message);
      assertSoftDeleteFullyApplied({
        requestedIds: payload.deleteIds,
        rows: (beforeDeleteRows ?? []) as Array<Record<string, unknown>>,
        appliedIds: deleteIds,
      });
    }
    const normalized = await normalizeRpcTransactionPayload(
      supabase,
      documentId,
      safePatches,
      payload.creates ?? [],
      deleteIds,
    );
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: normalized.updates,
      p_delete_ids: deleteIds,
      p_actor_id: actorId,
      p_creates: normalized.creates,
    });
    if (error) throw new Error(error.message);
    const result = data as {
      status?: string;
      blocks?: unknown[];
      created_blocks?: unknown[];
    };
    if (result?.status === 'conflict') {
      throw new Error('version_conflict during op apply');
    }
    const patched = (result?.blocks ?? []).map((row) => toSnapshot(row as Record<string, unknown>));
    const created = (result?.created_blocks ?? []).map((row) => toSnapshot(row as Record<string, unknown>));
    return [...patched, ...created];
  }
  case 'purge_block': {
    const { error } = await supabase
      .from('note_blocks')
      .delete()
      .eq('id', payload.id)
      .eq('document_id', documentId)
      .not('deleted_at', 'is', null);
    if (error) throw new Error(error.message);
    return [];
  }
  default: {
    const _exhaustive: never = payload;
    return _exhaustive;
  }
  }
}

export async function pushNoteBlockOps(
  supabase: SupabaseClient,
  documentId: string,
  baseSeq: number,
  ops: NoteBlockOpPushItem[],
  actorId: string,
): Promise<
  | {
    ok: true;
    lastSeq: number;
    appliedClientOpIds: string[];
    rejectedClientOpIds: string[];
    blocks: NoteBlockSnapshot[];
  }
  | { ok: false; error: 'seq_conflict'; lastSeq: number; ops: NoteBlockOpRecord[] }
> {
  if (ops.length === 0) {
    const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
    return { ok: true, lastSeq, appliedClientOpIds: [], rejectedClientOpIds: [], blocks: [] };
  }

  // client_op_id 기준 멱등 처리: 이미 기록된 op은 재적용하지 않는다(재시도/다중 탭 안전).
  const clientOpIds = ops.map((op) => op.clientOpId);
  const { data: existingRows, error: existingError } = await supabase
    .from('note_block_ops')
    .select('client_op_id')
    .eq('document_id', documentId)
    .in('client_op_id', clientOpIds);
  if (existingError) throw new Error(existingError.message);
  const existingSet = new Set((existingRows ?? []).map((row) => String(row.client_op_id)));

  const newOps = ops.filter((op) => !existingSet.has(op.clientOpId));

  if (newOps.length === 0) {
    // 전부 이미 commit됨 — leave materialize만 재시도(ack만 하고 삭제가 안 된 좀비 방지)
    const blocks: NoteBlockSnapshot[] = [];
    for (const op of ops) {
      if (!isLeaveMaterializePayload(op.payload)) continue;
      blocks.push(...await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId));
    }
    const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
    return { ok: true, lastSeq, appliedClientOpIds: clientOpIds, rejectedClientOpIds: [], blocks };
  }

  // op마다: commit → materialize. leave는 duplicate여도 materialize를 다시 시도.
  // regressive patch_content는 commit 금지 — ACK≠materialize 구멍 차단.
  const appliedClientOpIds: string[] = [...existingSet];
  const rejectedClientOpIds: string[] = [];
  const blocks: NoteBlockSnapshot[] = [];
  let runningBaseSeq = baseSeq;

  for (const op of newOps) {
    if (op.payload.opType === 'patch_content') {
      const { data: current } = await supabase
        .from('note_blocks')
        .select('content')
        .eq('id', op.payload.blockId)
        .eq('document_id', documentId)
        .maybeSingle();
      if (
        current
        && shouldIgnoreRegressiveContentPatch(
          current.content,
          op.payload.content,
          op.payload.baseContent,
        )
      ) {
        rejectedClientOpIds.push(op.clientOpId);
        continue;
      }
    }

    // patch_fields / transaction content — regressive면 commit·ACK 금지 (strip 후 ACK 구멍 차단)
    if (
      op.payload.opType === 'patch_fields'
      || op.payload.opType === 'block_transaction'
    ) {
      let rejected = false;
      for (const patch of op.payload.patches) {
        if (patch.content === undefined) continue;
        const { data: current } = await supabase
          .from('note_blocks')
          .select('content')
          .eq('id', patch.id)
          .eq('document_id', documentId)
          .maybeSingle();
        if (
          current
          && shouldIgnoreRegressiveContentPatch(current.content, patch.content)
        ) {
          rejected = true;
          break;
        }
      }
      if (rejected) {
        rejectedClientOpIds.push(op.clientOpId);
        continue;
      }
    }

    const commit = await commitNoteBlockOp(
      supabase,
      documentId,
      runningBaseSeq,
      op,
      actorId,
    );

    if (commit.status === 'conflict') {
      const missed = await pullNoteBlockOps(supabase, documentId, baseSeq);
      return {
        ok: false,
        error: 'seq_conflict',
        lastSeq: missed.lastSeq,
        ops: missed.ops,
      };
    }

    if (commit.status === 'duplicate') {
      if (isLeaveMaterializePayload(op.payload)) {
        blocks.push(...await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId));
        appliedClientOpIds.push(op.clientOpId);
      } else if (op.payload.opType === 'patch_content') {
        // duplicate여도 materialize 재시도 — ACK≠빈 apply 금지
        const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);
        if (applied.length === 0) {
          rejectedClientOpIds.push(op.clientOpId);
        } else {
          blocks.push(...applied);
          appliedClientOpIds.push(op.clientOpId);
        }
      } else {
        appliedClientOpIds.push(op.clientOpId);
      }
      runningBaseSeq = commit.assignedSeq;
      continue;
    }

    const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);
    // ZERO LOSS #1: materialize 실패([])인데 ACK하면 draft clear·saved 후보가 열린다
    if (op.payload.opType === 'patch_content' && applied.length === 0) {
      rejectedClientOpIds.push(op.clientOpId);
      runningBaseSeq = commit.assignedSeq;
      continue;
    }
    blocks.push(...applied);
    appliedClientOpIds.push(op.clientOpId);
    runningBaseSeq = commit.assignedSeq;
  }

  const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
  return { ok: true, lastSeq, appliedClientOpIds, rejectedClientOpIds, blocks };
}

export async function loadNoteDocumentSnapshot(
  supabase: SupabaseClient,
  documentId: string,
  actorId: string,
): Promise<NoteBlockSnapshot[]> {
  void actorId;
  const rows = await fetchActiveDocumentBlocks(supabase, documentId);
  return rows.map((row) => toSnapshot(row as unknown as Record<string, unknown>));
}
