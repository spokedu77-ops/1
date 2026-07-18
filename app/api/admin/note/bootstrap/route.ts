import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  getChildDocumentIdFromPageContent,
  reconcileDocumentParents,
} from '@/app/lib/note/documentParentSync';
import { loadNoteDocumentBlocks } from '@/app/lib/server/loadNoteDocumentBlocks';

const DOCUMENT_SELECT =
  'id, title, is_archived, is_favorite, is_pinned, is_public, share_token, parent_id, slug, properties, created_at, updated_at';

/**
 * 노트 진입 1회 왕복 — 문서 목록 + (선택) 활성 문서 블록을 requireAdmin 한 번으로 반환.
 * 배포 환경에서 documents + blocks/load 이중 호출·이중 Auth 왕복을 줄인다.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    const supabase = getServiceSupabase();

    const documentsQuery = supabase
      .from('note_documents')
      .select(DOCUMENT_SELECT)
      .is('deleted_at', null)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200);

    const [documentsResult, blocks] = await Promise.all([
      documentsQuery,
      documentId ? loadNoteDocumentBlocks(documentId, auth.userId) : Promise.resolve(null),
    ]);

    if (documentsResult.error) {
      devLogger.error('[admin/note/bootstrap] documents error', documentsResult.error);
      return NextResponse.json({ error: documentsResult.error.message }, { status: 500 });
    }

    const baseDocuments = documentsResult.data ?? [];
    const documentsById = new Map(baseDocuments.map((doc) => [doc.id, doc]));
    const requiredDocumentIds = new Set<string>();
    if (documentId) requiredDocumentIds.add(documentId);
    for (const block of blocks ?? []) {
      if (block.type !== 'page') continue;
      const childId = getChildDocumentIdFromPageContent(block.content as Record<string, unknown> | null);
      if (childId) requiredDocumentIds.add(childId);
    }

    for (let pass = 0; pass < 4; pass += 1) {
      const missingIds = [...requiredDocumentIds].filter((id) => !documentsById.has(id));
      if (missingIds.length === 0) break;
      const { data: missingDocuments, error: missingDocumentsError } = await supabase
        .from('note_documents')
        .select(DOCUMENT_SELECT)
        .in('id', missingIds)
        .is('deleted_at', null)
        .eq('is_archived', false);
      if (missingDocumentsError) {
        devLogger.error('[admin/note/bootstrap] required documents error', missingDocumentsError);
        return NextResponse.json({ error: missingDocumentsError.message }, { status: 500 });
      }
      for (const doc of missingDocuments ?? []) {
        documentsById.set(doc.id, doc);
        if (doc.parent_id) requiredDocumentIds.add(doc.parent_id);
      }
    }

    const documents = await reconcileDocumentParents(supabase, [...documentsById.values()]);

    return NextResponse.json({
      documents,
      ...(blocks ? { blocks, documentId } : {}),
    });
  } catch (err) {
    devLogger.error('[admin/note/bootstrap] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
