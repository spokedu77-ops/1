import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

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

    // 7일 경과 여부를 서버에서도 확인 (UI 우회 방지)
    const { data: doc, error: docError } = await supabase
      .from('note_documents')
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle();

    if (docError) {
      devLogger.error('[admin/note/trash/purge] doc fetch error', docError);
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    const deletedAt = doc?.deleted_at ? new Date(doc.deleted_at).getTime() : null;
    if (!deletedAt) {
      return NextResponse.json({ error: 'Document is not in trash' }, { status: 400 });
    }

    const ageMs = Date.now() - deletedAt;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < sevenDaysMs) {
      return NextResponse.json({ error: 'Document is not old enough to purge' }, { status: 400 });
    }

    // 물리 삭제 (note_blocks는 ON DELETE CASCADE)
    const { error } = await supabase
      .from('note_documents')
      .delete()
      .eq('id', id);

    if (error) {
      devLogger.error('[admin/note/trash/purge] delete error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[admin/note/trash/purge] exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

