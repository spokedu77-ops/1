import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      content?: unknown;
      checked?: unknown;
      collapsed?: unknown;
    } | null;

    const updates: Record<string, unknown> = {
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.content === 'string') {
      updates.content = body.content;
    }
    if (typeof body?.checked === 'boolean') {
      updates.checked = body.checked;
    }
    if (typeof body?.collapsed === 'boolean') {
      updates.collapsed = body.collapsed;
    }

    if (Object.keys(updates).length <= 2) {
      return NextResponse.json({ ok: false, error: '수정할 필드가 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from('admin_memo_blocks')
      .select('id, memo_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ ok: false, error: '블록을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('admin_memo_blocks')
      .update(updates)
      .eq('id', id)
      .select(
        'id, memo_id, parent_block_id, type, content, checked, collapsed, order_index, created_by, updated_by, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await supabase
      .from('admin_memos')
      .update({ updated_by: auth.userId, updated_at: updates.updated_at })
      .eq('id', existing.memo_id);

    return NextResponse.json({ ok: true, block: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from('admin_memo_blocks')
      .select('id, memo_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ ok: false, error: '블록을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { error, count } = await supabase
      .from('admin_memo_blocks')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ ok: false, error: '블록을 찾을 수 없습니다.' }, { status: 404 });
    }

    await supabase
      .from('admin_memos')
      .update({ updated_by: auth.userId, updated_at: new Date().toISOString() })
      .eq('id', existing.memo_id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
