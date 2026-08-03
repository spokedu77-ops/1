import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';
import { buildChildrenByParentBlock, collectBlockForestIds, topLevelSelectedDragIds } from '@/app/lib/note/noteBlockTree';
import { getChildDocumentIdFromPageContent } from '@/app/lib/note/documentParentSync';
import { noteBlocksLoadPath } from './noteBlocksLoad';
import { resolveInboundTopPlacementOrders } from './notePlacementOrders';
import { isNoteOplogSyncEnabled } from './noteOplogSync';

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

export type BuildBlockForestTransferOptions = {
  /**
   * 타깃 문서 루트 형제(이미 로드된 스냅샷).
   * 없으면 inbound만 0..n-1 — 타깃 기존과 충돌할 수 있으므로 호출측은
   * `fetchDocumentRootBlocksForPlacement`로 넘기는 것이 C5 기본.
   */
  targetRootBlocks?: ReadonlyArray<Pick<NoteBlock, 'id' | 'order_index' | 'parent_block_id'>>;
};

/** 타깃 문서 루트만 로드 — 현재 open 문서를 건드리지 않음 (C5 transfer merge용) */
export async function fetchDocumentRootBlocksForPlacement(documentId: string): Promise<NoteBlock[]> {
  const res = await fetch(
    noteBlocksLoadPath(documentId, {
      skipServerMigration: isNoteOplogSyncEnabled(),
    }),
    { credentials: 'include', cache: 'no-store' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || '타깃 문서 블록 로드 실패');
  }
  const json = (await res.json()) as { blocks?: NoteBlock[] };
  return (json.blocks ?? [])
    .filter((block) => (block.parent_block_id ?? null) === null)
    .sort((left, right) => {
      if (left.order_index !== right.order_index) return left.order_index - right.order_index;
      return left.id.localeCompare(right.id);
    });
}

/** 블록 트리를 다른 문서로 옮길 때 PATCH 목록 생성 */
export function buildBlockForestTransferCommand(
  blocks: NoteBlock[],
  selectedRootIds: string[],
  targetDocumentId: string,
  options?: BuildBlockForestTransferOptions,
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

  const targetRoots = (options?.targetRootBlocks ?? [])
    .filter((block) => (block.parent_block_id ?? null) === null && !movedSet.has(block.id));
  const placementOrders = resolveInboundTopPlacementOrders(targetRoots, rootIds.map((id) => ({ id })));
  const orderById = new Map(placementOrders.map((patch) => [patch.id, patch.order_index]));

  const patches: NoteBlockFieldPatch[] = [
    ...movedIds.map((id): NoteBlockFieldPatch => ({
      id,
      document_id: targetDocumentId,
      ...(rootSet.has(id)
        ? { parent_block_id: null, order_index: orderById.get(id) ?? 0 }
        : {}),
    })),
    ...placementOrders
      .filter((patch) => !movedSet.has(patch.id))
      .map((patch): NoteBlockFieldPatch => ({
        id: patch.id,
        order_index: patch.order_index,
      })),
  ];

  return {
    rootIds,
    movedIds,
    patches,
    nextBlocks: blocks.filter((block) => !movedSet.has(block.id)),
  };
}
