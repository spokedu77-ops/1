import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { wouldCreatePageCycle, resolveUserDisplayNames } from '@/app/lib/admin/memo/memoDb';
import { MEMO_PAGE_SELECT } from '@/app/lib/admin/memo/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('admin_memos')
      .select(MEMO_PAGE_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, { status: 404 });
    }

    let updated_by_name: string | null = null;
    if (data.updated_by) {
      const nameMap = await resolveUserDisplayNames(supabase, [data.updated_by]);
      updated_by_name = nameMap.get(data.updated_by) ?? null;
    }

    return NextResponse.json({ ok: true, page: { ...data, updated_by_name } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      title?: unknown;
      body?: unknown;
      parentId?: unknown;
    } | null;

    const updates: Record<string, unknown> = {
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.title === 'string') {
      updates.title = body.title;
    }

    if (typeof body?.body === 'string') {
      updates.body = body.body;
    }

    if (body && 'parentId' in body) {
      const parentId =
        typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null;
      if (parentId === id) {
        return NextResponse.json({ ok: false, error: '자기 자신을 부모로 둘 수 없습니다.' }, { status: 400 });
      }
      const supabase = getServiceSupabase();
      if (parentId && (await wouldCreatePageCycle(supabase, id, parentId))) {
        return NextResponse.json({ ok: false, error: '순환 참조가 됩니다.' }, { status: 400 });
      }
      updates.parent_id = parentId;
    }

    if (!('title' in updates) && !('body' in updates) && !('parent_id' in updates)) {
      return NextResponse.json({ ok: false, error: '수정할 필드가 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('admin_memos')
      .update(updates)
      .eq('id', id)
      .select(MEMO_PAGE_SELECT)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, page: data });
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
    const { error, count } = await supabase
      .from('admin_memos')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
