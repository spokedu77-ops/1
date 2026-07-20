import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { NOTE_BLOCK_PATCH_BATCH_MAX } from '@/app/lib/note/noteBlockBatch';
import { sanitizeNoteBlockTree } from '@/app/lib/note/noteBlockSanitize';

type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: unknown;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  version: number;
};

export function collectActiveSubtreeIds(rootIds: string[], blocks: NoteBlock[]): string[] {
  const childrenByParent = new Map<string, NoteBlock[]>();
  for (const block of blocks) {
    if (block.deleted_at || !block.parent_block_id) continue;
    const list = childrenByParent.get(block.parent_block_id) ?? [];
    list.push(block);
    childrenByParent.set(block.parent_block_id, list);
  }

  const result = new Set<string>();
  const walk = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    for (const child of childrenByParent.get(id) ?? []) {
      walk(child.id);
    }
  };
  for (const id of rootIds) walk(id);
  return [...result];
}

async function insertAuditLog({
  documentId,
  blockId,
  actorId,
  action,
  summary,
  diff,
}: {
  documentId: string;
  blockId?: string | null;
  actorId: string;
  action: string;
  summary: string;
  diff?: unknown;
}) {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('note_audit_logs').insert({
      document_id: documentId,
      block_id: blockId ?? null,
      actor_id: actorId,
      action,
      summary,
      diff: diff ?? null,
    });
    if (error) devLogger.error('[admin/note/blocks] audit log error', error);
  } catch (err) {
    devLogger.error('[admin/note/blocks] audit log exception', err);
  }
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseOffset(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

type BlockFieldPatch = {
  id: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
  document_id?: string;
  expected_version?: number;
};

function parseBlockFieldPatch(raw: unknown): BlockFieldPatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id : null;
  if (!id) return null;

  const patch: BlockFieldPatch = { id };
  if (typeof item.type === 'string') patch.type = item.type;
  if (item.content !== undefined) patch.content = item.content;
  if (typeof item.order_index === 'number') patch.order_index = item.order_index;
  if (typeof item.document_id === 'string') patch.document_id = item.document_id;
  if (item.parent_block_id === null || typeof item.parent_block_id === 'string') {
    patch.parent_block_id = item.parent_block_id;
  } else if (item.parentBlockId === null || typeof item.parentBlockId === 'string') {
    patch.parent_block_id = item.parentBlockId;
  }
  if (typeof item.expected_version === 'number') {
    patch.expected_version = item.expected_version;
  } else if (typeof item.expectedVersion === 'number') {
    patch.expected_version = item.expectedVersion;
  }

  if (Object.keys(patch).length <= 1) return null;
  return patch;
}

function patchToRowFields(patch: BlockFieldPatch): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (typeof patch.type === 'string') fields.type = patch.type;
  if (patch.content !== undefined) fields.content = patch.content;
  if (typeof patch.order_index === 'number') fields.order_index = patch.order_index;
  if (typeof patch.document_id === 'string') fields.document_id = patch.document_id;
  if (patch.parent_block_id === null || typeof patch.parent_block_id === 'string') {
    fields.parent_block_id = patch.parent_block_id;
  }
  return fields;
}

async function fetchBlockById(
  supabase: ReturnType<typeof getServiceSupabase>,
  id: string,
): Promise<NoteBlock | null> {
  const { data, error } = await supabase
    .from('note_blocks')
    .select(BLOCK_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NoteBlock | null) ?? null;
}

type ApplyPatchResult =
  | { ok: true; block: NoteBlock }
  | { ok: false; conflict: NoteBlock };

async function applyBlockFieldPatch(
  supabase: ReturnType<typeof getServiceSupabase>,
  patch: BlockFieldPatch,
  userId: string,
  now: string,
): Promise<ApplyPatchResult> {
  const fields = patchToRowFields(patch);
  if (Object.keys(fields).length === 0) {
    const current = await fetchBlockById(supabase, patch.id);
    if (!current) throw new Error(`block not found: ${patch.id}`);
    return { ok: true, block: current };
  }

  const expectedVersion = typeof patch.expected_version === 'number'
    ? patch.expected_version
    : null;

  if (expectedVersion == null) {
    const current = await fetchBlockById(supabase, patch.id);
    if (!current) throw new Error(`block not found: ${patch.id}`);
    const { data, error } = await supabase
      .from('note_blocks')
      .update({
        ...fields,
        updated_at: now,
        updated_by: userId,
        version: (current.version ?? 1) + 1,
      })
      .eq('id', patch.id)
      .is('deleted_at', null)
      .select(BLOCK_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`block update failed: ${patch.id}`);
    return { ok: true, block: data as NoteBlock };
  }

  const { data, error } = await supabase
    .from('note_blocks')
    .update({
      ...fields,
      updated_at: now,
      updated_by: userId,
      version: expectedVersion + 1,
    })
    .eq('id', patch.id)
    .eq('version', expectedVersion)
    .is('deleted_at', null)
    .select(BLOCK_SELECT)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) {
    const conflict = await fetchBlockById(supabase, patch.id);
    if (!conflict) throw new Error(`block not found: ${patch.id}`);
    return { ok: false, conflict };
  }

  return { ok: true, block: data as NoteBlock };
}

async function applyBlockFieldPatches(
  supabase: ReturnType<typeof getServiceSupabase>,
  patches: BlockFieldPatch[],
  userId: string,
  now: string,
): Promise<{ blocks?: NoteBlock[]; conflicts?: NoteBlock[]; error?: string }> {
  if (patches.length === 0) return { blocks: [] };

  const updatedBlocks: NoteBlock[] = [];
  for (const patch of patches) {
    const result = await applyBlockFieldPatch(supabase, patch, userId, now);
    if (!result.ok) {
      return { conflicts: [result.conflict] };
    }
    updatedBlocks.push(result.block);
  }

  return { blocks: updatedBlocks };
}

async function auditBatchBlockUpdates(
  supabase: ReturnType<typeof getServiceSupabase>,
  patches: BlockFieldPatch[],
  actorId: string,
  summary: string,
) {
  const ids = patches.map((patch) => patch.id);
  const { data: rows } = ids.length > 0
    ? await supabase
      .from('note_blocks')
      .select('document_id')
      .in('id', ids)
    : { data: [] };

  const documentIds = [...new Set((rows ?? []).map((row) => row.document_id).filter(Boolean))] as string[];
  await Promise.all(
    documentIds.map((documentId) =>
      insertAuditLog({
        documentId,
        actorId,
        action: 'batch_update_blocks',
        summary,
        diff: { count: patches.length, ids: patches.map((patch) => patch.id) },
      }),
    ),
  );
}

function buildInvariantRepairPatch(before: NoteBlock, after: NoteBlock): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if ((before.parent_block_id ?? null) !== (after.parent_block_id ?? null)) {
    patch.parent_block_id = after.parent_block_id ?? null;
  }
  if (before.order_index !== after.order_index) {
    patch.order_index = after.order_index;
  }
  if (before.type !== after.type) {
    patch.type = after.type;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function enforceDocumentBlockInvariants(
  supabase: ReturnType<typeof getServiceSupabase>,
  documentIds: string[],
  userId: string,
  now: string,
): Promise<void> {
  const uniqueDocumentIds = [...new Set(documentIds.filter(Boolean))];
  for (const documentId of uniqueDocumentIds) {
    const { data, error } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    const before = (data ?? []) as NoteBlock[];
    const sanitizable = before.map((block) => ({
      ...block,
      content: block.content && typeof block.content === 'object'
        ? block.content as Record<string, unknown>
        : null,
    }));
    const after = sanitizeNoteBlockTree(sanitizable) as NoteBlock[];
    const beforeById = new Map(before.map((block) => [block.id, block]));
    for (const block of after) {
      const prev = beforeById.get(block.id);
      if (!prev) continue;
      const patch = buildInvariantRepairPatch(prev, block);
      if (!patch) continue;
      const { error: updateError } = await supabase
        .from('note_blocks')
        .update({ ...patch, updated_at: now, updated_by: userId })
        .eq('id', block.id)
        .eq('document_id', documentId)
        .is('deleted_at', null);
      if (updateError) throw new Error(updateError.message);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const parentBlockId = searchParams.get('parentBlockId');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const limit = parsePositiveInt(searchParams.get('limit'), 300, 1000);
    const offset = parseOffset(searchParams.get('offset'));
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const query = supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', documentId)
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);
    if (!includeDeleted) {
      query.is('deleted_at', null);
    }
    if (parentBlockId === 'null') {
      query.is('parent_block_id', null);
    } else if (parentBlockId) {
      query.eq('parent_block_id', parentBlockId);
    }
    const { data, error } = await query;

    if (error) {
      devLogger.error('[admin/note/blocks] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      blocks: (data ?? []) as NoteBlock[],
      limit,
      offset,
    });
  } catch (err) {
    devLogger.error('[admin/note/blocks] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const documentId = typeof body.documentId === 'string' ? body.documentId : null;
    const parentBlockId = typeof body.parent_block_id === 'string'
      ? body.parent_block_id
      : (typeof body.parentBlockId === 'string'
        ? body.parentBlockId
        : (body.parentBlockId === null || body.parent_block_id === null ? null : undefined));
    const type = typeof body.type === 'string' ? body.type : 'text';
    const content = body.content ?? {};
    const requestedOrderIndex = typeof body.order_index === 'number' ? body.order_index : null;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 현재 문서의 최소 order_index 계산 (없으면 0부터 시작)
    // 새 블록을 "최상단"에 추가하기 위해 min - 1 값을 사용합니다.
    const minQuery = supabase
      .from('note_blocks')
      .select('order_index')
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .limit(1);
    if (parentBlockId === null) minQuery.is('parent_block_id', null);
    if (typeof parentBlockId === 'string') minQuery.eq('parent_block_id', parentBlockId);
    const { data: minRow, error: minError } = await minQuery.maybeSingle();

    if (minError) {
      devLogger.error('[admin/note/blocks] POST min order error', minError);
      return NextResponse.json({ error: minError.message }, { status: 500 });
    }

    const nextOrderIndex = requestedOrderIndex ?? (typeof minRow?.order_index === 'number' ? minRow.order_index - 1 : 0);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_blocks')
      .insert({
        document_id: documentId,
        ...(parentBlockId !== undefined ? { parent_block_id: parentBlockId } : {}),
        type,
        order_index: nextOrderIndex,
        content,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        deleted_by: null,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select(BLOCK_SELECT)
      .single();

    if (error) {
      devLogger.error('[admin/note/blocks] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const block = data as NoteBlock;
    await enforceDocumentBlockInvariants(supabase, [block.document_id], auth.userId, now);
    await insertAuditLog({
      documentId: block.document_id,
      blockId: block.id,
      actorId: auth.userId,
      action: 'create_block',
      summary: `${type} 블록 생성`,
      diff: { after: block },
    });

    return NextResponse.json({ block });
  } catch (err) {
    devLogger.error('[admin/note/blocks] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));

    if (Array.isArray(body.updates)) {
      const patches = body.updates
        .map((item: unknown) => parseBlockFieldPatch(item))
        .filter((item: BlockFieldPatch | null): item is BlockFieldPatch => !!item);
      if (patches.length === 0) {
        return NextResponse.json({ error: 'updates array required' }, { status: 400 });
      }
      if (patches.length > NOTE_BLOCK_PATCH_BATCH_MAX) {
        return NextResponse.json(
          { error: `updates max ${NOTE_BLOCK_PATCH_BATCH_MAX}` },
          { status: 400 },
        );
      }

      const supabase = getServiceSupabase();
      const now = new Date().toISOString();
      const result = await applyBlockFieldPatches(supabase, patches, auth.userId, now);
      if (result.conflicts?.length) {
        return NextResponse.json(
          { error: 'version_conflict', conflicts: result.conflicts },
          { status: 409 },
        );
      }
      if (result.error) {
        devLogger.error('[admin/note/blocks] PATCH batch error', result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      const affectedDocumentIds = [
        ...new Set((result.blocks ?? []).map((block) => block.document_id).filter(Boolean)),
      ];
      await enforceDocumentBlockInvariants(supabase, affectedDocumentIds, auth.userId, now);

      void auditBatchBlockUpdates(
        supabase,
        patches,
        auth.userId,
        patches.length > 1 ? `블록 ${patches.length}개 일괄 수정` : '블록 수정',
      );

      return NextResponse.json({ ok: true, count: patches.length, blocks: result.blocks ?? [] });
    }

    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const singlePatch = parseBlockFieldPatch(body);
    if (!singlePatch) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const beforeBlock = await fetchBlockById(supabase, id);
    if (!beforeBlock) {
      return NextResponse.json({ error: 'block not found' }, { status: 404 });
    }

    const nextDocumentId = typeof body.document_id === 'string' ? body.document_id : null;
    if (nextDocumentId) {
      const { data: minRow, error: minError } = await supabase
        .from('note_blocks')
        .select('order_index')
        .eq('document_id', nextDocumentId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (minError) {
        devLogger.error('[admin/note/blocks] PATCH min order error', minError);
        return NextResponse.json({ error: minError.message }, { status: 500 });
      }

      singlePatch.document_id = nextDocumentId;
      if (singlePatch.order_index === undefined) {
        singlePatch.order_index = typeof minRow?.order_index === 'number' ? minRow.order_index - 1 : 0;
      }
    }

    const now = new Date().toISOString();
    const result = await applyBlockFieldPatch(supabase, singlePatch, auth.userId, now);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'version_conflict', conflicts: [result.conflict] },
        { status: 409 },
      );
    }

    const block = result.block;
    await enforceDocumentBlockInvariants(supabase, [block.document_id], auth.userId, now);
    await insertAuditLog({
      documentId: block.document_id,
      blockId: block.id,
      actorId: auth.userId,
      action: 'update_block',
      summary: '블록 수정',
      diff: { before: beforeBlock, after: block },
    });

    return NextResponse.json({ block });
  } catch (err) {
    devLogger.error('[admin/note/blocks] PATCH exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/note/blocks
 * Body: { orders?: { id, order_index }[], updates?: BlockFieldPatch[] }
 * 순서 변경 + depth/content 등 필드 일괄 갱신.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const orders = body.orders;
    const fieldPatches = Array.isArray(body.updates)
      ? body.updates
        .map((item: unknown) => parseBlockFieldPatch(item))
        .filter((item: BlockFieldPatch | null): item is BlockFieldPatch => !!item)
      : [];

    const hasOrders = Array.isArray(orders) && orders.length > 0;
    if (!hasOrders && fieldPatches.length === 0) {
      return NextResponse.json({ error: 'orders or updates array required' }, { status: 400 });
    }
    if (fieldPatches.length > NOTE_BLOCK_PATCH_BATCH_MAX) {
      return NextResponse.json(
        { error: `updates max ${NOTE_BLOCK_PATCH_BATCH_MAX}` },
        { status: 400 },
      );
    }

    const normalizedOrders = hasOrders
      ? orders.map((order: { id?: unknown; order_index?: unknown }) => ({
        id: typeof order.id === 'string' ? order.id : '',
        order_index: typeof order.order_index === 'number' ? order.order_index : Number.NaN,
      }))
      : [];

    if (hasOrders) {
      const hasInvalid = normalizedOrders.some(
        (order) => !order.id || !Number.isFinite(order.order_index) || order.order_index < 0,
      );
      if (hasInvalid) {
        return NextResponse.json({ error: 'invalid orders payload' }, { status: 400 });
      }
      const idSet = new Set(normalizedOrders.map((order) => order.id));
      if (idSet.size !== normalizedOrders.length) {
        return NextResponse.json({ error: 'duplicate ids in orders payload' }, { status: 400 });
      }
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    if (hasOrders) {
      const ids = normalizedOrders.map((order) => order.id);
      const { data: beforeRows } = ids.length > 0
        ? await supabase
          .from('note_blocks')
          .select('id, document_id, parent_block_id, order_index')
          .in('id', ids)
        : { data: [] };

      const updateResults = await Promise.all(
        normalizedOrders.map(({ id, order_index }) =>
          supabase
            .from('note_blocks')
            .update({ order_index, updated_at: now, updated_by: auth.userId })
            .eq('id', id),
        ),
      );
      const failedUpdate = updateResults.find((result) => result.error);
      if (failedUpdate?.error) {
        devLogger.error('[admin/note/blocks] PUT order error', failedUpdate.error);
        return NextResponse.json({ error: failedUpdate.error.message }, { status: 500 });
      }

      const documentIds = [...new Set((beforeRows ?? []).map((row) => row.document_id).filter(Boolean))];
      await enforceDocumentBlockInvariants(supabase, documentIds, auth.userId, now);
      await Promise.all(documentIds.map((documentId) => insertAuditLog({
        documentId,
        actorId: auth.userId,
        action: 'reorder_blocks',
        summary: '블록 순서 변경',
        diff: { before: beforeRows, after: orders },
      })));
    }

    if (fieldPatches.length > 0) {
      const patchResult = await applyBlockFieldPatches(supabase, fieldPatches, auth.userId, now);
      if (patchResult.conflicts?.length) {
        return NextResponse.json(
          { error: 'version_conflict', conflicts: patchResult.conflicts },
          { status: 409 },
        );
      }
      if (patchResult.error) {
        devLogger.error('[admin/note/blocks] PUT field patch error', patchResult.error);
        return NextResponse.json({ error: patchResult.error }, { status: 500 });
      }
      const affectedDocumentIds = [
        ...new Set((patchResult.blocks ?? []).map((block) => block.document_id).filter(Boolean)),
      ];
      await enforceDocumentBlockInvariants(supabase, affectedDocumentIds, auth.userId, now);
      void auditBatchBlockUpdates(
        supabase,
        fieldPatches,
        auth.userId,
        fieldPatches.length > 1 ? `블록 ${fieldPatches.length}개 필드 일괄 수정` : '블록 필드 수정',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[admin/note/blocks] PUT exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const idsParam = searchParams.get('ids');
    let ids: string[] = [];
    if (singleId) {
      ids = [singleId];
    } else if (idsParam) {
      ids = idsParam.split(',').map((value) => value.trim()).filter(Boolean);
    } else {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.ids)) {
        ids = body.ids.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data: rootBlocks, error: rootError } = await supabase
      .from('note_blocks')
      .select('id, document_id')
      .in('id', uniqueIds);
    if (rootError) {
      devLogger.error('[admin/note/blocks] DELETE root error', rootError);
      return NextResponse.json({ error: rootError.message }, { status: 500 });
    }

    const documentIds = [...new Set((rootBlocks ?? [])
      .map((block) => block.document_id)
      .filter(Boolean))];
    if (documentIds.length === 0) {
      return NextResponse.json({ ok: true, softDeleted: true, count: 0 });
    }

    const { data: allDocumentBlocks, error: beforeError } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .in('document_id', documentIds);
    if (beforeError) {
      devLogger.error('[admin/note/blocks] DELETE before error', beforeError);
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }

    const deleteIds = collectActiveSubtreeIds(uniqueIds, (allDocumentBlocks ?? []) as NoteBlock[]);
    const deleteTargets = ((allDocumentBlocks ?? []) as NoteBlock[])
      .filter((block) => deleteIds.includes(block.id))
      .filter((block) => !block.deleted_at);
    const deleteResults = await Promise.all(
      deleteTargets.map((block) =>
        supabase
          .from('note_blocks')
          .update({
            deleted_at: now,
            deleted_by: auth.userId,
            updated_at: now,
            updated_by: auth.userId,
            version: (block.version ?? 1) + 1,
          })
          .eq('id', block.id)
          .is('deleted_at', null)),
    );
    const failedDelete = deleteResults.find((result) => result.error);
    if (failedDelete?.error) {
      devLogger.error('[admin/note/blocks] DELETE error', failedDelete.error);
      return NextResponse.json({ error: failedDelete.error.message }, { status: 500 });
    }

    await Promise.all(
      deleteTargets.map((beforeBlock) =>
        beforeBlock.document_id
          ? insertAuditLog({
            documentId: beforeBlock.document_id,
            blockId: beforeBlock.id,
            actorId: auth.userId,
            action: 'trash_block',
            summary: uniqueIds.length > 1 ? '블록 일괄 휴지통 이동' : '블록 휴지통 이동',
            diff: { before: beforeBlock, after: { deleted_at: now, deleted_by: auth.userId } },
          })
          : Promise.resolve(),
      ),
    );

    return NextResponse.json({ ok: true, softDeleted: true, count: deleteTargets.length });
  } catch (err) {
    devLogger.error('[admin/note/blocks] DELETE exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

