import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  parent_id: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 복구 대상 문서의 parent_id를 확인
    const { data: current, error: currentError } = await supabase
      .from('note_documents')
      .select('id, parent_id')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      devLogger.error('[admin/note/trash/restore] current doc error', currentError);
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    let safeParentId: string | null = (current?.parent_id ?? null) as string | null;
    if (safeParentId) {
      // 부모가 휴지통/삭제 상태면 루트로 복구
      const { data: parent, error: parentError } = await supabase
        .from('note_documents')
        .select('id, deleted_at')
        .eq('id', safeParentId)
        .maybeSingle();
      if (parentError) {
        devLogger.error('[admin/note/trash/restore] parent doc error', parentError);
        return NextResponse.json({ error: parentError.message }, { status: 500 });
      }
      if (!parent || parent.deleted_at) safeParentId = null;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('note_documents')
      .update({
        deleted_at: null,
        deleted_by: null,
        parent_id: safeParentId,
        updated_at: now,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id, title, is_archived, is_favorite, parent_id, slug, created_at, updated_at, deleted_at, deleted_by')
      .single();

    if (error) {
      devLogger.error('[admin/note/trash/restore] restore error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data as NoteDocument });
  } catch (err) {
    devLogger.error('[admin/note/trash/restore] exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

