import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { NOTE_BLOCK_PATCH_BATCH_MAX } from '@/app/lib/note/noteBlockBatch';
import { devLogger } from '@/app/lib/logging/devLogger';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const updates = Array.isArray(body.updates) ? body.updates : [];
    const creates = Array.isArray(body.creates) ? body.creates : [];
    const deleteIds = Array.isArray(body.deleteIds)
      ? body.deleteIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (updates.length === 0 && deleteIds.length === 0 && creates.length === 0) {
      return NextResponse.json({ error: 'updates, creates, or deleteIds required' }, { status: 400 });
    }
    if (updates.length > NOTE_BLOCK_PATCH_BATCH_MAX * 5) {
      return NextResponse.json(
        { error: `updates max ${NOTE_BLOCK_PATCH_BATCH_MAX * 5}` },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc('note_apply_block_transaction', {
      p_updates: updates,
      p_delete_ids: deleteIds,
      p_actor_id: auth.userId,
      p_creates: creates,
    });
    if (error) throw new Error(error.message);
    const result = data as {
      status?: string;
      blocks?: unknown[];
      created_blocks?: unknown[];
      conflicts?: unknown[];
    } | null;
    if (result?.status === 'conflict') {
      return NextResponse.json(
        { error: 'version_conflict', conflicts: result.conflicts ?? [] },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      blocks: result?.blocks ?? [],
      createdBlocks: result?.created_blocks ?? [],
    });
  } catch (error) {
    devLogger.error('[admin/note/blocks/transaction]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
