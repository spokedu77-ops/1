/** note_block_ops payload — client·server 공유 */

export type NoteBlockOpType =
  | 'patch_content'
  | 'patch_fields'
  | 'soft_delete'
  | 'create_block'
  | 'block_transaction'
  | 'purge_block';

export type NoteBlockFieldPatchPayload = {
  id: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
  document_id?: string;
  expected_version?: number;
};

export type NoteBlockOpPayload =
  | {
    opType: 'patch_content';
    blockId: string;
    content: Record<string, unknown>;
  }
  | {
    opType: 'patch_fields';
    patches: NoteBlockFieldPatchPayload[];
  }
  | {
    opType: 'soft_delete';
    ids: string[];
  }
  | {
    opType: 'create_block';
    id?: string;
    documentId: string;
    blockType: string;
    content: Record<string, unknown>;
    order_index?: number;
    parent_block_id: string | null;
    normalizeOrders?: Array<{ id: string; order_index: number }>;
    transactionUpdates?: NoteBlockFieldPatchPayload[];
  }
  | {
    opType: 'block_transaction';
    patches: NoteBlockFieldPatchPayload[];
    deleteIds: string[];
    creates?: Array<{
      id?: string;
      document_id: string;
      parent_block_id: string | null;
      type: string;
      order_index: number;
      content: Record<string, unknown>;
    }>;
  }
  | {
    opType: 'purge_block';
    id: string;
  };

export type NoteBlockOpRecord = {
  seq: number;
  clientOpId: string;
  opType: NoteBlockOpType;
  payload: NoteBlockOpPayload;
  actorId: string | null;
  createdAt: string;
};

export type NoteBlockOpPushItem = {
  clientOpId: string;
  opType: NoteBlockOpType;
  payload: NoteBlockOpPayload;
};

export type NoteBlockOpPushRequest = {
  documentId: string;
  baseSeq: number;
  ops: NoteBlockOpPushItem[];
};

export type NoteBlockOpPushResult =
  | {
    ok: true;
    lastSeq: number;
    appliedClientOpIds: string[];
    blocks: NoteBlockSnapshot[];
  }
  | {
    ok: false;
    error: 'seq_conflict';
    lastSeq: number;
    ops: NoteBlockOpRecord[];
  };

export type NoteBlockSnapshot = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: Record<string, unknown> | null;
  version: number;
  updated_at: string;
  deleted_at?: string | null;
};

export type NoteBlockOpPullResult = {
  lastSeq: number;
  ops: NoteBlockOpRecord[];
};

export type NoteDocumentSyncState = {
  documentId: string;
  lastSeq: number;
};

export function isNoteBlockOpPayload(value: unknown): value is NoteBlockOpPayload {
  if (!value || typeof value !== 'object') return false;
  const opType = (value as { opType?: unknown }).opType;
  return typeof opType === 'string';
}

export function noteBlockOpTypeFromPayload(payload: NoteBlockOpPayload): NoteBlockOpType {
  return payload.opType;
}
