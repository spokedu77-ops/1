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
  const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);
  if (baseSeq !== lastSeq) {
    const missed = await pullNoteBlockOps(supabase, documentId, baseSeq);
    return {
      ok: false,
      error: 'seq_conflict',
      lastSeq: missed.lastSeq,
      ops: missed.ops,
    };
  }

  if (ops.length === 0) {
    return { ok: true, lastSeq, appliedClientOpIds: [], blocks: [] };
  }

  let seq = lastSeq;
  const appliedClientOpIds: string[] = [];
  const blocks: NoteBlockSnapshot[] = [];

  for (const op of ops) {
    const { data: existing } = await supabase
      .from('note_block_ops')
      .select('seq')
      .eq('document_id', documentId)
      .eq('client_op_id', op.clientOpId)
      .maybeSingle();
    if (existing) {
      appliedClientOpIds.push(op.clientOpId);
      continue;
    }

    seq += 1;
    const applied = await applyNoteBlockOpPayload(supabase, documentId, op.payload, actorId);
    blocks.push(...applied);

    const { error: insertError } = await supabase.from('note_block_ops').insert({
      document_id: documentId,
      seq,
      client_op_id: op.clientOpId,
      actor_id: actorId,
      op_type: op.opType,
      payload: op.payload,
    });
    if (insertError) {
      devLogger.error('[noteOpLog] insert op failed', insertError);
      throw new Error(insertError.message);
    }
    appliedClientOpIds.push(op.clientOpId);
  }

  const { error: stateError } = await supabase
    .from('note_document_sync_state')
    .upsert({
      document_id: documentId,
      last_seq: seq,
      updated_at: new Date().toISOString(),
    });
  if (stateError) throw new Error(stateError.message);

  return { ok: true, lastSeq: seq, appliedClientOpIds, blocks };
}

export async function loadNoteDocumentSnapshot(
  supabase: SupabaseClient,
  documentId: string,
  actorId: string,
): Promise<NoteBlockSnapshot[]> {
  const rows = await loadNoteDocumentBlocksRaw(documentId, actorId);
  return rows.map((row) => toSnapshot(row as unknown as Record<string, unknown>));
}
