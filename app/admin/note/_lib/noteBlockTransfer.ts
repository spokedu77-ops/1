import type { NoteBlockFieldPatch } from './noteBlocksApi';

/** 블록 트리를 다른 문서로 옮길 때 PATCH 목록 생성 */
export function buildBlockTransferPatches(
  rootBlockId: string,
  blockIds: string[],
  targetDocumentId: string,
): NoteBlockFieldPatch[] {
  return blockIds.map((id) => ({
    id,
    document_id: targetDocumentId,
    ...(id === rootBlockId ? { parent_block_id: null as null } : {}),
  }));
}
