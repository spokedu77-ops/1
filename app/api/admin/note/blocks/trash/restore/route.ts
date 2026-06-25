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
  version: number;
};

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

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
    const { data: root, error: rootError } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .maybeSingle();

    if (rootError) {
      devLogger.error('[admin/note/blocks/trash/restore] root error', rootError);
      return NextResponse.json({ error: rootError.message }, { status: 500 });
    }
    if (!root) {
      return NextResponse.json({ error: 'Block is not in trash' }, { status: 400 });
    }

    const { data: deletedBatch, error: batchError } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', root.document_id)
      .eq('deleted_at', root.deleted_at)
      .limit(1000);
    if (batchError) {
      devLogger.error('[admin/note/blocks/trash/restore] batch error', batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    const rows = (deletedBatch ?? []) as NoteBlock[];
    const restoreIds = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (!row.parent_block_id || !restoreIds.has(row.parent_block_id) || restoreIds.has(row.id)) {
          continue;
        }
        restoreIds.add(row.id);
        changed = true;
      }
    }

    const { data: restored, error: restoreError } = await supabase
      .from('note_blocks')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
        updated_by: auth.userId,
      })
      .in('id', [...restoreIds])
      .not('deleted_at', 'is', null)
      .select(BLOCK_SELECT);

    if (restoreError) {
      devLogger.error('[admin/note/blocks/trash/restore] restore error', restoreError);
      return NextResponse.json({ error: restoreError.message }, { status: 500 });
    }

    const restoredBlocks = (restored ?? []) as NoteBlock[];
    const restoredRoot = restoredBlocks.find((block) => block.id === id);
    if (!restoredRoot) {
      return NextResponse.json({ error: 'Block restore failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, block: restoredRoot, blocks: restoredBlocks });
  } catch (err) {
    devLogger.error('[admin/note/blocks/trash/restore] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

