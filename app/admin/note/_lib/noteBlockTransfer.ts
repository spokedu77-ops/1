import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';
import { collectBlockForestIds, topLevelSelectedDragIds } from '@/app/lib/note/noteBlockTree';
import { getChildDocumentIdFromPageContent } from '@/app/lib/note/documentParentSync';

/** page 링크를 그 링크가 가리키는 문서 안으로 옮기면 parent_id 자기참조·사이드바 실종 발생 */
export function isPageLinkToDocument(block: NoteBlock, documentId: string): boolean {
  if (block.type !== 'page') return false;
  const linkedId = getChildDocumentIdFromPageContent(
    (block.content ?? null) as Record<string, unknown> | null,
  );
  return !!linkedId && linkedId === documentId;
}

/** 블록 트리를 다른 문서로 옮길 때 PATCH 목록 생성 */
export function buildBlockForestTransferCommand(
  blocks: NoteBlock[],
  selectedRootIds: string[],
  targetDocumentId: string,
) {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const rootIds = topLevelSelectedDragIds(selectedRootIds, blocks).filter((id) => {
    const block = blockById.get(id);
    return !block || !isPageLinkToDocument(block, targetDocumentId);
  });
  if (rootIds.length === 0) {
    return {
      rootIds: [] as string[],
      movedIds: [] as string[],
      patches: [] as NoteBlockFieldPatch[],
      nextBlocks: blocks,
    };
  }
  const movedIds = collectBlockForestIds(rootIds, blocks);
  const rootSet = new Set(rootIds);
  const movedSet = new Set(movedIds);
  return {
    rootIds,
    movedIds,
    patches: movedIds.map((id): NoteBlockFieldPatch => ({
      id,
      document_id: targetDocumentId,
      ...(rootSet.has(id) ? { parent_block_id: null } : {}),
    })),
    nextBlocks: blocks.filter((block) => !movedSet.has(block.id)),
  };
}
