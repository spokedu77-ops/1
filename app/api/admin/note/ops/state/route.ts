import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getNoteDocumentSyncState } from '@/app/lib/server/noteOpLog/noteOpLogService';
import { devLogger } from '@/app/lib/logging/devLogger';

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
    const { lastSeq } = await getNoteDocumentSyncState(supabase, documentId);

    return NextResponse.json({ documentId, lastSeq });
  } catch (err) {
    devLogger.error('[admin/note/ops/state]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
