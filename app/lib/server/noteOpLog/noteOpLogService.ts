import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NoteBlockOpPayload,
  NoteBlockOpPushItem,
  NoteBlockOpRecord,
  NoteBlockSnapshot,
} from '@/app/lib/note/noteBlockOpTypes';
import { loadNoteDocumentBlocksRaw } from '@/app/lib/server/loadNoteDocumentBlocksRaw';
import { commitNoteBlockOp } from '@/app/lib/server/noteOpLog/noteCommitBlockOp';

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

function readContentText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const value = (content as Record<string, unknown>).text;
  return typeof value === 'string' ? value : '';
}

export function shouldIgnoreRegressiveContentPatch(
  currentContent: unknown,
  incomingContent: unknown,
  baseContent?: unknown,
): boolean {
  const currentText = readContentText(currentContent).trim();
  const incomingText = readContentText(incomingContent).trim();
  const baseText = readContentText(baseContent).trim();
  if (!currentText) return false;
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

async function filterExistingTransactionPatches<T extends { id: string }>(
  supabase: SupabaseClient,
  patches: T[],
): Promise<T[]> {
  if (patches.length === 0) return patches;
  const ids = [...new Set(patches.map((patch) => patch.id).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('note_blocks')
    .select('id')
    .in('id', ids);
  if (error) throw new Error(error.message);
  const existingIds = new Set((data ?? []).map((row) => String(row.id)));
  return filterTransactionPatchesByExistingIds(patches, existingIds);
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
      payload.patches.map(stripExpectedVersion),
    );
    if (patches.length === 0) return [];
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: patches,
      p_delete_ids: [],
      p_actor_id: actorId,
      p_creates: [],
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
    const targets = (beforeBlocks ?? []).filter((row) => !row.deleted_at);
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
    const updates = await filterExistingTransactionPatches(supabase, [
      ...(payload.normalizeOrders ?? []).map((order) => ({
        id: order.id,
        order_index: order.order_index,
      })),
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
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: updates,
      p_delete_ids: [],
      p_actor_id: actorId,
      p_creates: creates,
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
      payload.patches.map(stripExpectedVersion),
    );
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: patches,
      p_delete_ids: payload.deleteIds,
      p_actor_id: actorId,
      p_creates: payload.creates ?? [],
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
    const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);

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
  const rows = await loadNoteDocumentBlocksRaw(documentId, actorId);
  return rows.map((row) => toSnapshot(row as unknown as Record<string, unknown>));
}
