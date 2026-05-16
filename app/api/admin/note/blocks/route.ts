import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: unknown;
  created_at: string;
  updated_at: string;
};

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const parentBlockId = searchParams.get('parentBlockId');
    const limit = parsePositiveInt(searchParams.get('limit'), 300, 1000);
    const offset = parseOffset(searchParams.get('offset'));
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const query = supabase
      .from('note_blocks')
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at')
      .eq('document_id', documentId)
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);
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
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/blocks] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const block = data as NoteBlock;
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
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    const nextDocumentId = typeof body.document_id === 'string' ? body.document_id : null;
    if (typeof body.type === 'string') {
      updates.type = body.type;
    }
    if (body.content !== undefined) {
      updates.content = body.content;
    }
    if (typeof body.order_index === 'number') {
      updates.order_index = body.order_index;
    }
    if (body.parent_block_id === null || typeof body.parent_block_id === 'string') {
      updates.parent_block_id = body.parent_block_id;
    } else if (body.parentBlockId === null || typeof body.parentBlockId === 'string') {
      updates.parent_block_id = body.parentBlockId;
    }

    const supabase = getServiceSupabase();
    const { data: beforeBlock, error: beforeError } = await supabase
      .from('note_blocks')
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) {
      devLogger.error('[admin/note/blocks] PATCH before error', beforeError);
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }

    // 문서 이동 요청인 경우: 대상 문서 최상단(min-1)으로 들어가게 order_index를 서버에서 계산
    if (nextDocumentId) {
      const { data: minRow, error: minError } = await supabase
        .from('note_blocks')
        .select('order_index')
        .eq('document_id', nextDocumentId)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (minError) {
        devLogger.error('[admin/note/blocks] PATCH min order error', minError);
        return NextResponse.json({ error: minError.message }, { status: 500 });
      }

      updates.document_id = nextDocumentId;
      if (updates.order_index === undefined) {
        updates.order_index = typeof minRow?.order_index === 'number' ? minRow.order_index - 1 : 0;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_blocks')
      .update({
        ...updates,
        updated_at: now,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/blocks] PATCH error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const block = data as NoteBlock;
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
 * Body: { orders: { id: string; order_index: number }[] }
 * 드래그 앤 드롭 후 블록 순서를 일괄 업데이트합니다.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const orders = body.orders;
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'orders array required' }, { status: 400 });
    }
    const normalizedOrders = orders.map((order: { id?: unknown; order_index?: unknown }) => ({
      id: typeof order.id === 'string' ? order.id : '',
      order_index: typeof order.order_index === 'number' ? order.order_index : Number.NaN,
    }));
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
    const orderIndexSet = new Set(normalizedOrders.map((order) => order.order_index));
    if (orderIndexSet.size !== normalizedOrders.length) {
      return NextResponse.json({ error: 'duplicate order_index in orders payload' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const ids = normalizedOrders
      .map((order: { id?: unknown }) => (typeof order.id === 'string' ? order.id : null))
      .filter((id: string | null): id is string => !!id);
    const { data: beforeRows } = ids.length > 0
      ? await supabase
        .from('note_blocks')
        .select('id, document_id, parent_block_id, order_index')
        .in('id', ids)
      : { data: [] };

    await Promise.all(
      normalizedOrders.map(({ id, order_index }) =>
        supabase
          .from('note_blocks')
          .update({ order_index, updated_at: now, updated_by: auth.userId })
          .eq('id', id),
      ),
    );

    const documentIds = [...new Set((beforeRows ?? []).map((row) => row.document_id).filter(Boolean))];
    await Promise.all(documentIds.map((documentId) => insertAuditLog({
      documentId,
      actorId: auth.userId,
      action: 'reorder_blocks',
      summary: '블록 순서 변경',
      diff: { before: beforeRows, after: orders },
    })));

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
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: beforeBlock, error: beforeError } = await supabase
      .from('note_blocks')
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) {
      devLogger.error('[admin/note/blocks] DELETE before error', beforeError);
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }

    const { error } = await supabase.from('note_blocks').delete().eq('id', id);

    if (error) {
      devLogger.error('[admin/note/blocks] DELETE error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (beforeBlock?.document_id) {
      await insertAuditLog({
        documentId: beforeBlock.document_id,
        blockId: beforeBlock.id,
        actorId: auth.userId,
        action: 'delete_block',
        summary: '블록 삭제',
        diff: { before: beforeBlock },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[admin/note/blocks] DELETE exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

