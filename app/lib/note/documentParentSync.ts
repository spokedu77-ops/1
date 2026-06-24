import type { SupabaseClient } from '@supabase/supabase-js';

type DocRow = {
  id: string;
  parent_id: string | null;
};

export type PageBlockRow = {
  document_id: string;
  content: Record<string, unknown> | null;
};

export function getChildDocumentIdFromPageContent(
  content: Record<string, unknown> | null | undefined,
): string | null {
  const childId =
    typeof content?.page_document_id === 'string' ? content.page_document_id.trim() : '';
  return childId || null;
}

/** page 블록이 가리키는 child → 부모 문서 id */
export function buildParentByChildFromPageBlocks(
  pageBlocks: PageBlockRow[],
  docIds?: Set<string>,
): Map<string, string> {
  const parentByChild = new Map<string, string>();
  for (const block of pageBlocks) {
    const childId = getChildDocumentIdFromPageContent(block.content);
    if (!childId) continue;
    if (docIds && !docIds.has(childId)) continue;
    if (!parentByChild.has(childId)) {
      parentByChild.set(childId, block.document_id);
    }
  }
  return parentByChild;
}

/**
 * page 블록 위치를 canonical로 note_documents.parent_id 패치 계획을 만든다.
 * (DB 쓰기 없음 — 클라이언트·서버 공용)
 */
export function planDocumentParentPatches<T extends DocRow>(
  documents: T[],
  pageBlocks: PageBlockRow[],
): Array<{ id: string; parent_id: string | null }> {
  if (documents.length === 0) return [];

  const docIds = new Set(documents.map((doc) => doc.id));
  const parentByChild = buildParentByChildFromPageBlocks(pageBlocks, docIds);
  const patches: Array<{ id: string; parent_id: string | null }> = [];

  for (const doc of documents) {
    const canonicalParent = parentByChild.get(doc.id) ?? null;
    if (canonicalParent) {
      if (doc.parent_id !== canonicalParent) {
        patches.push({ id: doc.id, parent_id: canonicalParent });
      }
      continue;
    }
    if (doc.parent_id && docIds.has(doc.parent_id)) {
      const parentHasLink = [...parentByChild.entries()].some(
        ([childId, parentId]) => childId === doc.id && parentId === doc.parent_id,
      );
      if (!parentHasLink) {
        patches.push({ id: doc.id, parent_id: null });
      }
    }
  }

  return patches;
}

export function applyDocumentParentPatchesInMemory<T extends DocRow>(
  documents: T[],
  patches: Array<{ id: string; parent_id: string | null }>,
): T[] {
  if (patches.length === 0) return documents;
  const patchMap = new Map(patches.map((patch) => [patch.id, patch.parent_id]));
  return documents.map((doc) =>
    patchMap.has(doc.id) ? { ...doc, parent_id: patchMap.get(doc.id)! } : doc,
  );
}

/** page 블록 위치를 기준으로 note_documents.parent_id를 맞춘다. */
export async function reconcileDocumentParents<T extends DocRow>(
  supabase: SupabaseClient,
  documents: T[],
): Promise<T[]> {
  if (documents.length === 0) return documents;

  const docIds = new Set(documents.map((doc) => doc.id));
  const { data: pageBlocks, error } = await supabase
    .from('note_blocks')
    .select('document_id, content')
    .eq('type', 'page')
    .is('deleted_at', null)
    .limit(2000);

  if (error || !pageBlocks?.length) {
    return documents;
  }

  const patches = planDocumentParentPatches(
    documents,
    pageBlocks as PageBlockRow[],
  );
  if (patches.length === 0) return documents;

  const now = new Date().toISOString();
  await Promise.all(
    patches.map((patch) =>
      supabase
        .from('note_documents')
        .update({ parent_id: patch.parent_id, updated_at: now })
        .eq('id', patch.id),
    ),
  );

  return applyDocumentParentPatchesInMemory(documents, patches);
}

/** 하위 문서를 가리키는 page 블록을 모두 제거(최상위 분리 시 재부착 방지) */
export async function removePageBlocksForChildDocument(
  supabase: SupabaseClient,
  childDocumentId: string,
  actorId?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: blocks, error } = await supabase
    .from('note_blocks')
    .select('id')
    .eq('type', 'page')
    .is('deleted_at', null)
    .filter('content->>page_document_id', 'eq', childDocumentId);

  if (error || !blocks?.length) return;

  await supabase
    .from('note_blocks')
    .update({
      deleted_at: now,
      deleted_by: actorId ?? null,
      updated_at: now,
    })
    .in('id', blocks.map((block) => block.id));
}
