import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteBlock = {
  id: string;
  document_id: string;
  type: string;
  order_index: number;
  content: unknown;
  created_at: string;
  updated_at: string;
};

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
    const limit = parsePositiveInt(searchParams.get('limit'), 300, 1000);
    const offset = parseOffset(searchParams.get('offset'));
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('note_blocks')
      .select('id, document_id, type, order_index, content, created_at, updated_at')
      .eq('document_id', documentId)
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);

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
    const type = typeof body.type === 'string' ? body.type : 'text';
    const content = body.content ?? {};

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 현재 문서의 최대 order_index 계산 (없으면 0부터 시작)
    const { data: maxRow, error: maxError } = await supabase
      .from('note_blocks')
      .select('order_index')
      .eq('document_id', documentId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      devLogger.error('[admin/note/blocks] POST max order error', maxError);
      return NextResponse.json({ error: maxError.message }, { status: 500 });
    }

    const nextOrderIndex = typeof maxRow?.order_index === 'number' ? maxRow.order_index + 1 : 0;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_blocks')
      .insert({
        document_id: documentId,
        type,
        order_index: nextOrderIndex,
        content,
        created_at: now,
        updated_at: now,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('id, document_id, type, order_index, content, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/blocks] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data as NoteBlock });
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
    if (typeof body.type === 'string') {
      updates.type = body.type;
    }
    if (body.content !== undefined) {
      updates.content = body.content;
    }
    if (typeof body.order_index === 'number') {
      updates.order_index = body.order_index;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_blocks')
      .update({
        ...updates,
        updated_at: now,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .select('id, document_id, type, order_index, content, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/blocks] PATCH error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data as NoteBlock });
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

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    await Promise.all(
      orders.map(({ id, order_index }: { id: string; order_index: number }) =>
        supabase
          .from('note_blocks')
          .update({ order_index, updated_at: now, updated_by: auth.userId })
          .eq('id', id),
      ),
    );

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
    const { error } = await supabase.from('note_blocks').delete().eq('id', id);

    if (error) {
      devLogger.error('[admin/note/blocks] DELETE error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

