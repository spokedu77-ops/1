import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  assignSiblingOrdersFromEncounter,
  densifyDuplicateSiblingOrders,
  isNoteLiteBlockType,
  shouldRejectEmptySnapshot,
  sortLiteBlocksForDisplay,
  type NoteLiteBlock,
  type NoteLiteBlockType,
} from '@/app/lib/note/noteLiteInvariants';

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, version';

function asLiteBlock(row: Record<string, unknown>, documentId: string): NoteLiteBlock | null {
  const type = typeof row.type === 'string' ? row.type : '';
  if (!isNoteLiteBlockType(type)) return null;
  const content =
    row.content && typeof row.content === 'object' && !Array.isArray(row.content)
      ? (row.content as NoteLiteBlock['content'])
      : { text: '' };
  return {
    id: String(row.id),
    document_id: documentId,
    parent_block_id: typeof row.parent_block_id === 'string' ? row.parent_block_id : null,
    type,
    order_index: typeof row.order_index === 'number' ? row.order_index : 0,
    content: {
      text: typeof content.text === 'string' ? content.text : '',
      ...(type === 'todo' ? { checked: Boolean(content.checked) } : {}),
    },
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { id: documentId } = await context.params;
    if (!documentId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });
    if (error) throw new Error(error.message);

    const lite = densifyDuplicateSiblingOrders(
      ((data ?? []) as Record<string, unknown>[])
        .map((row) => asLiteBlock(row, documentId))
        .filter((b): b is NoteLiteBlock => b != null),
    );
    return NextResponse.json({ blocks: sortLiteBlocksForDisplay(lite) });
  } catch (err) {
    devLogger.error('[admin/note/lite snapshot] GET', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { id: documentId } = await context.params;
    if (!documentId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as {
      blocks?: unknown;
      allowEmpty?: boolean;
    };
    const allowEmpty = body.allowEmpty === true;
    if (!Array.isArray(body.blocks)) {
      return NextResponse.json({ error: 'blocks array required' }, { status: 400 });
    }

    const incoming: NoteLiteBlock[] = [];
    for (const raw of body.blocks) {
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: 'invalid block' }, { status: 400 });
      }
      const row = raw as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id.trim() : '';
      const type = typeof row.type === 'string' ? row.type : '';
      if (!id || !isNoteLiteBlockType(type)) {
        return NextResponse.json({ error: 'invalid block type or id' }, { status: 400 });
      }
      const content =
        row.content && typeof row.content === 'object' && !Array.isArray(row.content)
          ? (row.content as NoteLiteBlock['content'])
          : { text: '' };
      incoming.push({
        id,
        document_id: documentId,
        parent_block_id: typeof row.parent_block_id === 'string' ? row.parent_block_id : null,
        type: type as NoteLiteBlockType,
        order_index: typeof row.order_index === 'number' ? row.order_index : 0,
        content: {
          text: typeof content.text === 'string' ? content.text : '',
          ...(type === 'todo' ? { checked: Boolean(content.checked) } : {}),
        },
      });
    }

    if (incoming.some((b) => b.parent_block_id === b.id)) {
      return NextResponse.json({ error: 'block cannot parent itself' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: existingAll, error: existingError } = await supabase
      .from('note_blocks')
      .select('id, deleted_at')
      .eq('document_id', documentId);
    if (existingError) throw new Error(existingError.message);
    const existingLiveIds = new Set(
      (existingAll ?? []).filter((r) => r.deleted_at == null).map((r) => String(r.id)),
    );
    const existingAnyIds = new Set((existingAll ?? []).map((r) => String(r.id)));

    if (
      shouldRejectEmptySnapshot({
        existingLiveCount: existingLiveIds.size,
        incomingCount: incoming.length,
        allowEmpty,
      })
    ) {
      return NextResponse.json({ error: 'EMPTY_SNAPSHOT_REJECTED' }, { status: 409 });
    }

    const ordered = assignSiblingOrdersFromEncounter(incoming);
    const incomingIds = new Set(ordered.map((b) => b.id));
    const now = new Date().toISOString();
    const toDelete = [...existingLiveIds].filter((id) => !incomingIds.has(id));

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('note_blocks')
        .update({
          deleted_at: now,
          deleted_by: auth.userId,
          updated_at: now,
          updated_by: auth.userId,
        })
        .eq('document_id', documentId)
        .in('id', toDelete)
        .is('deleted_at', null);
      if (delError) throw new Error(delError.message);
    }

    for (const block of ordered) {
      const payload = {
        document_id: documentId,
        parent_block_id: block.parent_block_id,
        type: block.type,
        order_index: block.order_index,
        content: block.content,
        updated_at: now,
        updated_by: auth.userId,
        deleted_at: null,
        deleted_by: null,
      };
      if (existingAnyIds.has(block.id)) {
        const { error } = await supabase.from('note_blocks').update(payload).eq('id', block.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('note_blocks').insert({
          ...payload,
          id: block.id,
          created_at: now,
          created_by: auth.userId,
          version: 1,
        });
        if (error) throw new Error(error.message);
      }
    }

    const { error: touchError } = await supabase
      .from('note_documents')
      .update({ updated_at: now, updated_by: auth.userId })
      .eq('id', documentId);
    if (touchError) throw new Error(touchError.message);

    return NextResponse.json({ ok: true, blocks: ordered });
  } catch (err) {
    devLogger.error('[admin/note/lite snapshot] PUT', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
