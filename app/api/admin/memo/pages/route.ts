import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { nextPageOrderIndex, resolveUserDisplayNames } from '@/app/lib/admin/memo/memoDb';
import { MEMO_PAGE_SELECT, type MemoPageRow } from '@/app/lib/admin/memo/types';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('admin_memos')
      .select(MEMO_PAGE_SELECT)
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as MemoPageRow[];
    const nameMap = await resolveUserDisplayNames(
      supabase,
      rows.map((r) => r.updated_by).filter((id): id is string => Boolean(id)),
    );

    const pages = rows.map((row) => ({
      ...row,
      updated_by_name: row.updated_by ? nameMap.get(row.updated_by) ?? null : null,
    }));

    return NextResponse.json({ ok: true, pages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as {
      parentId?: unknown;
      title?: unknown;
    } | null;

    const parentId =
      typeof body?.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null;
    const title = typeof body?.title === 'string' ? body.title : '';

    const supabase = getServiceSupabase();

    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('admin_memos')
        .select('id')
        .eq('id', parentId)
        .maybeSingle();
      if (parentError) {
        return NextResponse.json({ ok: false, error: parentError.message }, { status: 500 });
      }
      if (!parent) {
        return NextResponse.json({ ok: false, error: '부모 페이지를 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    const orderIndex = await nextPageOrderIndex(supabase, parentId);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('admin_memos')
      .insert({
        parent_id: parentId,
        title: title || '새 페이지',
        order_index: orderIndex,
        created_by: auth.userId,
        updated_by: auth.userId,
        updated_at: now,
      })
      .select(MEMO_PAGE_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, page: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
