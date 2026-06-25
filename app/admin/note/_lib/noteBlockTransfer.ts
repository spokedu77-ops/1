import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';
import { collectBlockForestIds, topLevelSelectedDragIds } from '@/app/lib/note/noteBlockTree';

/** 블록 트리를 다른 문서로 옮길 때 PATCH 목록 생성 */
export function buildBlockForestTransferCommand(
  blocks: NoteBlock[],
  selectedRootIds: string[],
  targetDocumentId: string,
) {
  const rootIds = topLevelSelectedDragIds(selectedRootIds, blocks);
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
