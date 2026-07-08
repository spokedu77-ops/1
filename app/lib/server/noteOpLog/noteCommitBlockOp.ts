import type { SupabaseClient } from '@supabase/supabase-js';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';

export type NoteCommitBlockOpResult =
  | { status: 'ok'; assignedSeq: number }
  | { status: 'duplicate'; assignedSeq: number }
  | { status: 'conflict' };

function parseCommitRow(data: unknown): NoteCommitBlockOpResult {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    return { status: 'conflict' };
  }
  const record = row as { status?: unknown; assigned_seq?: unknown };
  const status = typeof record.status === 'string' ? record.status : '';
  const assignedSeqRaw = record.assigned_seq;
  const assignedSeq = typeof assignedSeqRaw === 'number'
    ? assignedSeqRaw
    : Number(assignedSeqRaw);

  if (status === 'ok' && Number.isFinite(assignedSeq) && assignedSeq > 0) {
    return { status: 'ok', assignedSeq };
  }
  if (status === 'duplicate' && Number.isFinite(assignedSeq) && assignedSeq > 0) {
    return { status: 'duplicate', assignedSeq };
  }
  return { status: 'conflict' };
}

/** DB 트랜잭션 안에서 op row + sync_state를 원자적으로 커밋한다. */
export async function commitNoteBlockOp(
  supabase: SupabaseClient,
  documentId: string,
  baseSeq: number,
  op: NoteBlockOpPushItem,
  actorId: string,
): Promise<NoteCommitBlockOpResult> {
  const { data, error } = await supabase.rpc('note_commit_block_op', {
    p_document_id: documentId,
    p_base_seq: baseSeq,
    p_client_op_id: op.clientOpId,
    p_op_type: op.opType,
    p_payload: op.payload,
    p_actor_id: actorId,
  });
  if (error) {
    const message = error.message ?? '';
    if (message.includes('unique constraint') || message.includes('23505')) {
      return { status: 'conflict' };
    }
    throw new Error(error.message);
  }
  return parseCommitRow(data);
}
