import type { SupabaseClient } from '@supabase/supabase-js';
import { devLogger } from '@/app/lib/logging/devLogger';
import type {
  NoteBlockOpPayload,
  NoteBlockOpPushItem,
  NoteBlockOpRecord,
  NoteBlockSnapshot,
} from '@/app/lib/note/noteBlockOpTypes';
import { loadNoteDocumentBlocksRaw } from '@/app/lib/server/loadNoteDocumentBlocksRaw';

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
  return { lastSeq: typeof data.last_seq === 'number' ? data.last_seq : Number(data.last_seq) || 0 };
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
      .select('version')
      .eq('id', payload.blockId)
      .eq('document_id', documentId)
      .maybeSingle();
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
    if (!updated) throw new Error(`block not found: ${payload.blockId}`);
    return [toSnapshot(updated as Record<string, unknown>)];
  }
  case 'patch_fields': {
    const patches = payload.patches.map(stripExpectedVersion);
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
    const updates = [
      ...(payload.normalizeOrders ?? []).map((order) => ({
        id: order.id,
        order_index: order.order_index,
      })),
      ...(payload.transactionUpdates ?? []).map(stripExpectedVersion),
    ];
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
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: payload.patches.map(stripExpectedVersion),
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

  // 원자적 seq 예약: 동시 push는 서로 겹치지 않는 범위를 받거나 -1(충돌)을 받는다.
  const { data: reserved, error: reserveError } = await supabase.rpc('note_reserve_op_seqs', {
    p_document_id: documentId,
    p_base_seq: baseSeq,
    p_count: newOps.length,
  });
  if (reserveError) throw new Error(reserveError.message);
  const base = typeof reserved === 'number' ? reserved : Number(reserved);

  if (!Number.isFinite(base) || base < 0) {
    const missed = await pullNoteBlockOps(supabase, documentId, baseSeq);
    return {
      ok: false,
      error: 'seq_conflict',
      lastSeq: missed.lastSeq,
      ops: missed.ops,
    };
  }

  const appliedClientOpIds: string[] = [...existingSet];
  const blocks: NoteBlockSnapshot[] = [];
  let seq = base;

  for (const op of newOps) {
    seq += 1;

    // 효과(note_blocks materialize)를 먼저 적용한 뒤 op을 기록한다.
    // seq는 예약 범위라 유니크 충돌이 없고, insert 실패는 client_op_id 중복(다른 탭 선점)뿐이다.
    const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);

    const { error: insertError } = await supabase
      .from('note_block_ops')
      .insert({
        document_id: documentId,
        seq,
        client_op_id: op.clientOpId,
        actor_id: actorId,
        op_type: op.opType,
        payload: op.payload,
      });
    if (insertError) {
      const duplicateClientOp =
        insertError.code === '23505'
        && insertError.message.includes('client_op');
      if (duplicateClientOp) {
        // 다른 탭이 같은 op을 먼저 기록함 — 효과는 멱등하므로 적용 결과만 반영.
        blocks.push(...applied);
        appliedClientOpIds.push(op.clientOpId);
        continue;
      }
      devLogger.error('[noteOpLog] insert op failed', insertError);
      throw new Error(insertError.message);
    }

    blocks.push(...applied);
    appliedClientOpIds.push(op.clientOpId);
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
