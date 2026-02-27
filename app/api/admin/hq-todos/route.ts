/**
 * HQ 대시보드 todos API (Service Role 사용 → RLS 우회)
 * - assignee에 'Common', '최지훈' 등 문자열 저장 가능
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('todos')
      .select('id, title, assignee, status, tag, description')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[admin/hq-todos] GET', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const action = body.action as string | undefined | null;
    const supabase = getServiceSupabase();

    if (action === 'delete') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle') {
      const id = body.id;
      const nextStatus = body.nextStatus;
      if (!id || !nextStatus) return NextResponse.json({ error: 'id and nextStatus required' }, { status: 400 });
      const { error } = await supabase.from('todos').update({ status: nextStatus }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'insert' || action === 'update') {
      const payload = {
        title: body.title ?? '',
        assignee: body.assignee ?? 'Common',
        status: body.status ?? 'To Do',
        tag: body.tag ?? 'General',
        description: body.description ?? '',
      };
      if (action === 'update') {
        const id = body.id;
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const { error } = await supabase.from('todos').update(payload).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase.from('todos').insert([payload]);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/hq-todos] POST', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
