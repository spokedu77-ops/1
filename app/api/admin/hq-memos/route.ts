/**
 * HQ 대시보드 memos API (Service Role 사용 → RLS 우회)
 * - memos 테이블 사용 (assignee = 보드/담당자). 배포·로컬 동일 소스.
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('board_id');
    if (!boardId) return NextResponse.json({ error: 'board_id required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('memos')
      .select('content')
      .eq('assignee', boardId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ content: data?.content ?? '' });
  } catch (err) {
    console.error('[admin/hq-memos] GET', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const boardId = body.board_id;
    const content = body.content ?? '';
    if (!boardId) return NextResponse.json({ error: 'board_id required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('memos')
      .upsert(
        { assignee: boardId, content, updated_at: new Date().toISOString() },
        { onConflict: 'assignee' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/hq-memos] POST', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
