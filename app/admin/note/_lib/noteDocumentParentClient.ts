import {
  applyDocumentParentPatchesInMemory,
  getChildDocumentIdFromPageContent,
  planDocumentParentPatches,
  type PageBlockRow,
} from '@/app/lib/note/documentParentSync';
import type { NoteBlock, NoteDocument } from './types';

/** 현재 문서 블록 트리의 page 블록을 canonical로 관련 하위 문서 parent_id 패치를 계획 */
export function planParentPatchesForDocumentBlocks(
  documents: NoteDocument[],
  parentDocumentId: string,
  blocks: NoteBlock[],
): Array<{ id: string; parent_id: string | null }> {
  const pageBlocks: PageBlockRow[] = blocks
    .filter((block) => block.document_id === parentDocumentId && block.type === 'page')
    .map((block) => ({
      document_id: parentDocumentId,
      content: (block.content ?? null) as Record<string, unknown> | null,
    }));

  const linkedChildIds = new Set(
    pageBlocks
      .map((block) => getChildDocumentIdFromPageContent(block.content))
      .filter((id): id is string => !!id),
  );

  const relevantDocs = documents.filter(
    (doc) => doc.parent_id === parentDocumentId || linkedChildIds.has(doc.id),
  );

  return planDocumentParentPatches(relevantDocs, pageBlocks);
}

export function applyParentPatchesToDocuments(
  documents: NoteDocument[],
  patches: Array<{ id: string; parent_id: string | null }>,
): NoteDocument[] {
  return applyDocumentParentPatchesInMemory(documents, patches);
}

export function collectChildIdsFromPageBlocks(blocks: NoteBlock[]): string[] {
  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.type !== 'page') continue;
    const childId = getChildDocumentIdFromPageContent(block.content as Record<string, unknown>);
    if (childId) ids.add(childId);
  }
  return [...ids];
}
