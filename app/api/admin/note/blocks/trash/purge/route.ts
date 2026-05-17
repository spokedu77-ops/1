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
    const { data: block, error: fetchError } = await supabase
      .from('note_blocks')
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      devLogger.error('[admin/note/blocks/trash/purge] fetch error', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!block?.deleted_at) {
      return NextResponse.json({ error: 'Block is not in trash' }, { status: 400 });
    }

    const { error } = await supabase
      .from('note_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      devLogger.error('[admin/note/blocks/trash/purge] delete error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[admin/note/blocks/trash/purge] exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

