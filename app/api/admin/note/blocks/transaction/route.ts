import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { NOTE_BLOCK_PATCH_BATCH_MAX } from '@/app/lib/note/noteBlockBatch';
import { devLogger } from '@/app/lib/logging/devLogger';
import { sanitizeNoteBlockTree, type SanitizableNoteBlock } from '@/app/lib/note/noteBlockSanitize';

const BLOCK_SELECT = 'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

type TransactionUpdate = {
  id: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
  parentBlockId?: string | null;
  document_id?: string;
  documentId?: string;
  expected_version?: number;
  expectedVersion?: number;
};

type TransactionCreate = {
  id?: string;
  document_id?: string;
  documentId?: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
  parentBlockId?: string | null;
};

type ExistingBlock = SanitizableNoteBlock & {
  document_id: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  version?: number;
};

function readParentId(value: TransactionUpdate | TransactionCreate): string | null | undefined {
  if (value.parent_block_id === null || typeof value.parent_block_id === 'string') {
    return value.parent_block_id;
  }
  if (value.parentBlockId === null || typeof value.parentBlockId === 'string') {
    return value.parentBlockId;
  }
  return undefined;
}

function readDocumentId(value: TransactionUpdate | TransactionCreate): string | undefined {
  return typeof value.document_id === 'string'
    ? value.document_id
    : (typeof value.documentId === 'string' ? value.documentId : undefined);
}

export function normalizeTransactionPayloadForInvariants({
  existingBlocks,
  updates,
  creates,
  deleteIds,
}: {
  existingBlocks: ExistingBlock[];
  updates: TransactionUpdate[];
  creates: TransactionCreate[];
  deleteIds: string[];
}): { updates: TransactionUpdate[]; creates: TransactionCreate[] } {
  const deleted = new Set(deleteIds);
  const updateById = new Map(updates.filter((item) => typeof item.id === 'string').map((item) => [item.id, item]));

  const projectedExisting = existingBlocks
    .filter((block) => !deleted.has(block.id))
    .map((block) => {
      const update = updateById.get(block.id);
      const parent = update ? readParentId(update) : undefined;
      return {
        ...block,
        type: update?.type ?? block.type,
        content: update?.content !== undefined ? update.content as Record<string, unknown> : block.content,
        order_index: typeof update?.order_index === 'number' ? update.order_index : block.order_index,
        parent_block_id: parent !== undefined ? parent : block.parent_block_id,
        document_id: readDocumentId(update ?? {}) ?? block.document_id,
      };
    });

  const projectedCreates = creates
    .filter((item): item is TransactionCreate & { id: string } => typeof item.id === 'string')
    .map((item) => ({
      id: item.id,
      document_id: readDocumentId(item) ?? '',
      type: typeof item.type === 'string' ? item.type : 'text',
      content: (item.content ?? {}) as Record<string, unknown>,
      order_index: typeof item.order_index === 'number' ? item.order_index : 0,
      parent_block_id: readParentId(item) ?? null,
    }));

  const sanitized = sanitizeNoteBlockTree([...projectedExisting, ...projectedCreates]);
  const sanitizedById = new Map(sanitized.map((block) => [block.id, block]));

  const normalizedUpdates = updates.map((update) => {
    const sanitizedBlock = sanitizedById.get(update.id);
    if (!sanitizedBlock) return update;
    return {
      ...update,
      document_id: sanitizedBlock.document_id,
      parent_block_id: sanitizedBlock.parent_block_id ?? null,
      order_index: sanitizedBlock.order_index,
      ...(sanitizedBlock.type !== undefined ? { type: sanitizedBlock.type } : {}),
    };
  });

  const normalizedCreates = creates.map((create) => {
    if (!create.id) return create;
    const sanitizedBlock = sanitizedById.get(create.id);
    if (!sanitizedBlock) return create;
    return {
      ...create,
      document_id: sanitizedBlock.document_id,
      parent_block_id: sanitizedBlock.parent_block_id ?? null,
      order_index: sanitizedBlock.order_index,
      type: sanitizedBlock.type,
    };
  });

  return { updates: normalizedUpdates, creates: normalizedCreates };
}

async function loadTransactionDocumentBlocks(
  supabase: ReturnType<typeof getServiceSupabase>,
  updates: TransactionUpdate[],
  creates: TransactionCreate[],
) {
  const ids = updates.map((update) => update.id).filter(Boolean);
  const explicitDocumentIds = [
    ...updates.map(readDocumentId),
    ...creates.map(readDocumentId),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);
  const documents = new Set(explicitDocumentIds);

  if (ids.length > 0) {
    const { data, error } = await supabase
      .from('note_blocks')
      .select('document_id')
      .in('id', ids);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (typeof row.document_id === 'string') documents.add(row.document_id);
    }
  }

  if (documents.size === 0) return [];

  const { data, error } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .in('document_id', [...documents])
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExistingBlock[];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const updates = Array.isArray(body.updates) ? body.updates : [];
    const creates = Array.isArray(body.creates) ? body.creates : [];
    const deleteIds = Array.isArray(body.deleteIds)
      ? body.deleteIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (updates.length === 0 && deleteIds.length === 0 && creates.length === 0) {
      return NextResponse.json({ error: 'updates, creates, or deleteIds required' }, { status: 400 });
    }
    if (updates.length > NOTE_BLOCK_PATCH_BATCH_MAX * 5) {
      return NextResponse.json(
        { error: `updates max ${NOTE_BLOCK_PATCH_BATCH_MAX * 5}` },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const existingBlocks = await loadTransactionDocumentBlocks(supabase, updates, creates);
    const normalized = normalizeTransactionPayloadForInvariants({
      existingBlocks,
      updates,
      creates,
      deleteIds,
    });
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: normalized.updates,
      p_delete_ids: deleteIds,
      p_actor_id: auth.userId,
      p_creates: normalized.creates,
    });
    if (error) throw new Error(error.message);
    const result = data as {
      status?: string;
      blocks?: unknown[];
      created_blocks?: unknown[];
      conflicts?: unknown[];
    } | null;
    if (result?.status === 'conflict') {
      return NextResponse.json(
        { error: 'version_conflict', conflicts: result.conflicts ?? [] },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      blocks: result?.blocks ?? [],
      createdBlocks: result?.created_blocks ?? [],
    });
  } catch (error) {
    devLogger.error('[admin/note/blocks/transaction]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
