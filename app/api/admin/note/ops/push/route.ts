import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { pushNoteBlockOps } from '@/app/lib/server/noteOpLog/noteOpLogService';
import { devLogger } from '@/app/lib/logging/devLogger';

function parsePushOps(raw: unknown): NoteBlockOpPushItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const clientOpId = typeof record.clientOpId === 'string' ? record.clientOpId : '';
    const opType = typeof record.opType === 'string' ? record.opType : '';
    const payload = record.payload;
    if (!clientOpId || !opType || !payload || typeof payload !== 'object') return [];
    return [{
      clientOpId,
      opType: opType as NoteBlockOpPushItem['opType'],
      payload: payload as NoteBlockOpPushItem['payload'],
    }];
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const documentId = typeof body.documentId === 'string' ? body.documentId : '';
    const baseSeq = typeof body.baseSeq === 'number' ? body.baseSeq : Number(body.baseSeq) || 0;
    const ops = parsePushOps(body.ops);

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }
    if (ops.length > 100) {
      return NextResponse.json({ error: 'ops max 100 per push' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const result = await pushNoteBlockOps(supabase, documentId, baseSeq, ops, auth.userId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, lastSeq: result.lastSeq, ops: result.ops },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      lastSeq: result.lastSeq,
      appliedClientOpIds: result.appliedClientOpIds,
      blocks: result.blocks,
    });
  } catch (err) {
    devLogger.error('[admin/note/ops/push]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
