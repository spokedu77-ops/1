import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as {
      parentId?: unknown;
      orderedIds?: unknown;
    } | null;

    const parentId =
      typeof body?.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null;

    if (!Array.isArray(body?.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'orderedIds가 필요합니다.' }, { status: 400 });
    }

    const orderedIds = body.orderedIds.filter(
      (id): id is string => typeof id === 'string' && id.trim() !== '',
    );
    if (orderedIds.length !== body.orderedIds.length) {
      return NextResponse.json({ ok: false, error: 'orderedIds 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let query = supabase.from('admin_memos').select('id');
    query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);
    const { data: siblings, error: siblingsError } = await query;
    if (siblingsError) {
      return NextResponse.json({ ok: false, error: siblingsError.message }, { status: 500 });
    }

    const siblingIds = new Set((siblings ?? []).map((r) => r.id as string));
    if (siblingIds.size !== orderedIds.length) {
      return NextResponse.json({ ok: false, error: '형제 페이지 집합이 일치하지 않습니다.' }, { status: 400 });
    }
    for (const id of orderedIds) {
      if (!siblingIds.has(id)) {
        return NextResponse.json({ ok: false, error: '형제 페이지 집합이 일치하지 않습니다.' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase
        .from('admin_memos')
        .update({ order_index: i, updated_by: auth.userId, updated_at: now })
        .eq('id', orderedIds[i]);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
