import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';
import { buildChildrenByParentBlock, collectBlockForestIds, topLevelSelectedDragIds } from '@/app/lib/note/noteBlockTree';
import { getChildDocumentIdFromPageContent } from '@/app/lib/note/documentParentSync';

/** page 링크를 그 링크가 가리키는 문서 안으로 옮기면 parent_id 자기참조·사이드바 실종 발생 */
export function isPageLinkToDocument(block: NoteBlock, documentId: string): boolean {
  if (block.type !== 'page') return false;
  const linkedId = getChildDocumentIdFromPageContent(
    (block.content ?? null) as Record<string, unknown> | null,
  );
  return !!linkedId && linkedId === documentId;
}

function forestContainsPageLinkToDocument(
  rootId: string,
  blockById: Map<string, NoteBlock>,
  childrenByParent: Map<string | null, NoteBlock[]>,
  documentId: string,
): boolean {
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id) continue;
    const block = blockById.get(id);
    if (!block) continue;
    if (isPageLinkToDocument(block, documentId)) return true;
    for (const child of childrenByParent.get(id) ?? []) {
      stack.push(child.id);
    }
  }
  return false;
}

/** 블록 트리를 다른 문서로 옮길 때 PATCH 목록 생성 */
export function buildBlockForestTransferCommand(
  blocks: NoteBlock[],
  selectedRootIds: string[],
  targetDocumentId: string,
) {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const childrenByParent = buildChildrenByParentBlock(blocks);
  const rootIds = topLevelSelectedDragIds(selectedRootIds, blocks).filter((id) => {
    return !forestContainsPageLinkToDocument(id, blockById, childrenByParent, targetDocumentId);
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
  // 타깃 문서 루트로 올릴 때 order_index를 0..n-1로 재부여 — 중복 order로 persist guard가
  // 트랜잭션을 막아 드래그 직후 원위치 롤백되는 회귀 방지
  const rootOrderById = new Map(rootIds.map((id, index) => [id, index]));
  return {
    rootIds,
    movedIds,
    patches: movedIds.map((id): NoteBlockFieldPatch => ({
      id,
      document_id: targetDocumentId,
      ...(rootSet.has(id)
        ? { parent_block_id: null, order_index: rootOrderById.get(id) ?? 0 }
        : {}),
    })),
    nextBlocks: blocks.filter((block) => !movedSet.has(block.id)),
  };
}
