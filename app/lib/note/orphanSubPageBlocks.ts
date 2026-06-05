export type BlockWithPageLink = {
  id: string;
  type: string;
  parent_block_id?: string | null;
  order_index: number;
  content?: Record<string, unknown> | null;
};

export type ChildDocument = {
  id: string;
  title: string;
};

export type DocumentWithParent = {
  id: string;
  parent_id?: string | null;
};

/** targetId가 movingId의 하위 문서면 true (순환 방지) */
export function isDocumentDescendantOf(
  targetId: string,
  movingId: string,
  docMap: Map<string, DocumentWithParent>,
): boolean {
  let current = docMap.get(targetId);
  const visited = new Set<string>();
  while (current?.parent_id) {
    if (current.parent_id === movingId) return true;
    if (visited.has(current.parent_id)) break;
    visited.add(current.parent_id);
    current = docMap.get(current.parent_id);
  }
  return false;
}

/** parent_id 자식 문서 중 본문 page 블록이 없는 항목 */
export function findOrphanSubPageDocuments<T extends ChildDocument>(
  childDocuments: T[],
  blocks: BlockWithPageLink[],
): T[] {
  const linkedIds = new Set(
    blocks
      .filter((b) => b.type === 'page' && typeof b.content?.page_document_id === 'string')
      .map((b) => b.content!.page_document_id as string),
  );
  return childDocuments.filter((doc) => !linkedIds.has(doc.id));
}

/** 고아 하위 페이지용 page 블록 생성 계획 (루트 맨 아래 순서대로) */
export function planOrphanSubPageBlockInserts<T extends ChildDocument>(
  orphans: T[],
  rootBlocks: BlockWithPageLink[],
): { child: T; order_index: number; content: { page_document_id: string; title: string } }[] {
  const sortedRoots = [...rootBlocks]
    .filter((b) => !b.parent_block_id)
    .sort((a, b) => a.order_index - b.order_index);
  let nextIndex = sortedRoots.length;
  return orphans.map((child) => ({
    child,
    order_index: nextIndex++,
    content: {
      page_document_id: child.id,
      title: child.title || '제목 없음',
    },
  }));
}
