import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NoteBlockOpPayload,
  NoteBlockOpPushItem,
  NoteBlockOpRecord,
  NoteBlockSnapshot,
} from '@/app/lib/note/noteBlockOpTypes';
import { commitNoteBlockOp } from '@/app/lib/server/noteOpLog/noteCommitBlockOp';
import { sanitizeNoteBlockTree, type SanitizableNoteBlock } from '@/app/lib/note/noteBlockSanitize';

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
      return {
        ...patch,
        document_id: block.document_id,
        parent_block_id: block.parent_block_id ?? null,
        order_index: block.order_index,
        type: block.type,
      };
    }),
    creates: creates.map((create) => {
      if (!create.id) return create;
      const block = sanitizedById.get(create.id);
      if (!block) return create;
      return {
        ...create,
        document_id: block.document_id,
        parent_block_id: block.parent_block_id ?? null,
        order_index: block.order_index,
        type: block.type,
      };
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
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as OpSanitizableBlock[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function readContentText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  for (const key of ['text', 'title', 'html', 'body', 'caption', 'url', 'page_document_id']) {
    const value = record[key];
    if (key === 'html' && isEmptyHtml(value)) continue;
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

function isEmptyHtml(value: unknown): boolean {
  return value === ''
    || value === '<p></p>'
    || value === '<p><br></p>'
    || value === '<p><br class="ProseMirror-trailingBreak"></p>';
}

function hasStructuredContent(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  const record = content as Record<string, unknown>;
  return Object.entries(record).some(([key, value]) => {
    if (['checked', 'collapsed', 'icon', 'blockColor', 'backgroundColor', 'color'].includes(key)) return false;
    if (typeof value === 'string') {
      if (key === 'html') return !isEmptyHtml(value);
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  });
}

function softDeleteMetaMatches(
  row: Record<string, unknown>,
  deleteMeta: Array<{ id: string; updated_at?: string | null }> | undefined,
): boolean {
  const id = String(row.id);
  const meta = deleteMeta?.find((item) => item.id === id);
  if (!meta) {
    return !hasStructuredContent(row.content);
  }
  const expectedUpdatedAt = meta.updated_at == null ? null : String(meta.updated_at);
  if (!expectedUpdatedAt) return !hasStructuredContent(row.content);
  return String(row.updated_at ?? '') === expectedUpdatedAt;
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
  return (data ?? [])
    .filter((row) => !row.deleted_at)
    .filter((row) => softDeleteMetaMatches(row as Record<string, unknown>, deleteMeta))
    .map((row) => String(row.id));
}

export function shouldIgnoreRegressiveContentPatch(
  currentContent: unknown,
  incomingContent: unknown,
  baseContent?: unknown,
): boolean {
  const currentText = readContentText(currentContent).trim();
  const incomingText = readContentText(incomingContent).trim();
  const baseText = readContentText(baseContent).trim();
  const currentHasStructuredContent = hasStructuredContent(currentContent);
  const incomingHasStructuredContent = hasStructuredContent(incomingContent);
  const baseHasStructuredContent = hasStructuredContent(baseContent);
  if (!currentText && !currentHasStructuredContent) return false;
  if ((baseText || baseHasStructuredContent) && (
    baseText !== currentText
    || baseHasStructuredContent !== currentHasStructuredContent
  )) {
    return incomingText !== currentText
      || incomingHasStructuredContent !== currentHasStructuredContent;
  }
  if (!incomingText && !incomingHasStructuredContent) {
    return baseText !== currentText || baseHasStructuredContent !== currentHasStructuredContent;
  }
  if (!incomingText) return baseText !== currentText;
  if (incomingText.length >= currentText.length) return false;
  if (baseText && baseText === currentText) return false;
  return currentText.startsWith(incomingText);
}

export function filterTransactionPatchesByExistingIds<T extends { id: string }>(
  patches: T[],
  existingIds: ReadonlySet<string>,
): T[] {
  return patches.filter((patch) => existingIds.has(patch.id));
}

export function filterTransactionPatchesByDocument<T extends { id: string; document_id?: string }>(
  patches: T[],
  blockDocumentById: ReadonlyMap<string, string>,
  documentId: string,
): T[] {
  return patches.filter((patch) => blockDocumentById.get(patch.id) === documentId);
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
    if (patches.length === 0) return [];
    const normalized = await normalizeRpcTransactionPayload(supabase, documentId, patches, [], []);
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
    const targets = (beforeBlocks ?? [])
      .filter((row) => !row.deleted_at)
      .filter((row) => softDeleteMetaMatches(row as Record<string, unknown>, payload.deleteMeta));
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
    const creates = [{
      id: payload.id,
      document_id: payload.documentId,
      parent_block_id: payload.parent_block_id,
      type: payload.blockType,
      order_index: payload.order_index ?? 0,
      content: payload.content,
    }];
    const normalized = await normalizeRpcTransactionPayload(supabase, documentId, updates, creates, []);
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
    const deleteIds = payload.deleteIds.length > 0
      ? await filterSoftDeleteIdsByMeta(supabase, documentId, payload.deleteIds, payload.deleteMeta)
      : [];
    const normalized = await normalizeRpcTransactionPayload(
      supabase,
      documentId,
      patches,
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
  | { ok: true; lastSeq: number; appliedClientOpIds: string[]; blocks: NoteBlockSnapshot[] }
  | { ok: false; error: 'seq_conflict'; lastSeq: number; ops: NoteBlockOpRecord[] }
> {
  if (ops.length === 0) {
    const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
    return { ok: true, lastSeq, appliedClientOpIds: [], blocks: [] };
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
    // 전부 이미 적용됨(순수 재시도) — 충돌 아님.
    const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
    return { ok: true, lastSeq, appliedClientOpIds: clientOpIds, blocks: [] };
  }

  // op마다: materialize(apply) → DB 원자 commit(insert+sync). insert 실패 시 sync drift 없음.
  const appliedClientOpIds: string[] = [...existingSet];
  const blocks: NoteBlockSnapshot[] = [];
  let runningBaseSeq = baseSeq;

  for (const op of newOps) {
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
      appliedClientOpIds.push(op.clientOpId);
      runningBaseSeq = commit.assignedSeq;
      continue;
    }

    const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);
    blocks.push(...applied);
    appliedClientOpIds.push(op.clientOpId);
    runningBaseSeq = commit.assignedSeq;
  }

  const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
  return { ok: true, lastSeq, appliedClientOpIds, blocks };
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
