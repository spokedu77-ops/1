import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: unknown;
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
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('note_blocks')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by')
      .maybeSingle();

    if (error) {
      devLogger.error('[admin/note/blocks/trash/restore] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Block is not in trash' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, block: data as NoteBlock });
  } catch (err) {
    devLogger.error('[admin/note/blocks/trash/restore] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

