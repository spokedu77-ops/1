import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { loadNoteDocumentBlocks } from '@/app/lib/server/loadNoteDocumentBlocks';
import { loadNoteDocumentBlocksRaw } from '@/app/lib/server/loadNoteDocumentBlocksRaw';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const skipReconcile = searchParams.get('skipReconcile') === 'true';
    const blocks = skipReconcile
      ? await loadNoteDocumentBlocksRaw(documentId, auth.userId)
      : await loadNoteDocumentBlocks(documentId, auth.userId);
    return NextResponse.json({ blocks });
  } catch (err) {
    devLogger.error('[admin/note/blocks/load] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
