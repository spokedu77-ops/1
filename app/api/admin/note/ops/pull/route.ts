import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { pullNoteBlockOps } from '@/app/lib/server/noteOpLog/noteOpLogService';
import { devLogger } from '@/app/lib/logging/devLogger';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const sinceParam = searchParams.get('since');
    const sinceSeq = sinceParam == null ? 0 : Number(sinceParam);

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }
    if (!Number.isFinite(sinceSeq) || sinceSeq < 0) {
      return NextResponse.json({ error: 'invalid since' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const result = await pullNoteBlockOps(supabase, documentId, sinceSeq);

    return NextResponse.json(result);
  } catch (err) {
    devLogger.error('[admin/note/ops/pull]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
