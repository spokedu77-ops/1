import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import { pushNoteBlockOps, pullNoteBlockOps } from '@/app/lib/server/noteOpLog/noteOpLogService';
import { devLogger } from '@/app/lib/logging/devLogger';

function isSeqConflictMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('seq_conflict')
    || normalized.includes('duplicate key')
    || normalized.includes('unique constraint')
    || normalized.includes('note_block_ops_document_seq');
}

function isRecoverableApplyConflictMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('block not found')
    || normalized.includes('version_conflict');
}

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
  let documentId = '';
  let baseSeq = 0;
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    documentId = typeof body.documentId === 'string' ? body.documentId : '';
    baseSeq = typeof body.baseSeq === 'number' ? body.baseSeq : Number(body.baseSeq) || 0;
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
        { ok: false, error: result.error, lastSeq: result.lastSeq, ops: result.ops },
        { status: 200 },
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
    const message = err instanceof Error ? err.message : 'Server error';
    if ((isSeqConflictMessage(message) || isRecoverableApplyConflictMessage(message)) && documentId) {
      try {
        const supabase = getServiceSupabase();
        const missed = await pullNoteBlockOps(supabase, documentId, baseSeq);
        return NextResponse.json(
          { ok: false, error: 'seq_conflict', reason: message, lastSeq: missed.lastSeq, ops: missed.ops },
          { status: 200 },
        );
      } catch (pullErr) {
        devLogger.error('[admin/note/ops/push] conflict pull fallback failed', pullErr);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
