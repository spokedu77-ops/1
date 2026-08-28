import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: memoId } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      parentBlockId?: unknown;
      orderedIds?: unknown;
    } | null;

    const parentBlockId =
      typeof body?.parentBlockId === 'string' && body.parentBlockId.trim()
        ? body.parentBlockId.trim()
        : null;

    if (!Array.isArray(body?.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'orderedIds가 필요합니다.' }, { status: 400 });
    }

    const orderedIds = body.orderedIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    if (orderedIds.length !== body.orderedIds.length) {
      return NextResponse.json({ ok: false, error: 'orderedIds 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let query = supabase
      .from('admin_memo_blocks')
      .select('id')
      .eq('memo_id', memoId);
    query = parentBlockId
      ? query.eq('parent_block_id', parentBlockId)
      : query.is('parent_block_id', null);

    const { data: siblings, error: siblingsError } = await query;
    if (siblingsError) {
      return NextResponse.json({ ok: false, error: siblingsError.message }, { status: 500 });
    }

    const siblingIds = new Set((siblings ?? []).map((r) => r.id as string));
    if (siblingIds.size !== orderedIds.length) {
      return NextResponse.json({ ok: false, error: '형제 블록 집합이 일치하지 않습니다.' }, { status: 400 });
    }
    for (const id of orderedIds) {
      if (!siblingIds.has(id)) {
        return NextResponse.json({ ok: false, error: '형제 블록 집합이 일치하지 않습니다.' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase
        .from('admin_memo_blocks')
        .update({ order_index: i, updated_by: auth.userId, updated_at: now })
        .eq('id', orderedIds[i])
        .eq('memo_id', memoId);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    await supabase
      .from('admin_memos')
      .update({ updated_by: auth.userId, updated_at: now })
      .eq('id', memoId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
