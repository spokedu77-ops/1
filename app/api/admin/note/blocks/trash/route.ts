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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('note_blocks')
      .select('id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by')
      .eq('document_id', documentId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(300);

    if (error) {
      devLogger.error('[admin/note/blocks/trash] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocks: (data ?? []) as NoteBlock[] });
  } catch (err) {
    devLogger.error('[admin/note/blocks/trash] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

