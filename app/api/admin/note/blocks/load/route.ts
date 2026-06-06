import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { loadNoteDocumentBlocks } from '@/app/lib/server/loadNoteDocumentBlocks';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const documentId = new URL(request.url).searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const blocks = await loadNoteDocumentBlocks(documentId, auth.userId);
    return NextResponse.json({ blocks });
  } catch (err) {
    devLogger.error('[admin/note/blocks/load] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
