import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { readRememberedNoteDocumentBlocks } from './noteDocumentBlocksCache';
import { readLocalDocumentMemory } from './noteLocalDb';
import type { NoteBlock } from './types';

/**
 * React blocks가 아직 전환 문서를 반영하지 않았을 때도
 * 세션 캐시·IDB 메모리로 첫 프레임부터 본문을 그린다 (깜빡임 0).
 */
export function resolveInstantDisplayBlocks(
  documentId: string,
  blocks: NoteBlock[],
): NoteBlock[] {
  const fromState = blocks.filter((block) => block.document_id === documentId);
  if (fromState.length > 0) {
    return dedupeNoteBlocksById(fromState);
  }

  const remembered = readRememberedNoteDocumentBlocks(documentId);
  if (remembered !== null) {
    return dedupeNoteBlocksById(remembered);
  }

  const local = readLocalDocumentMemory(documentId);
  if (local && local.blocks.length > 0) {
    return dedupeNoteBlocksById(
      local.blocks.filter((block) => block.document_id === documentId),
    );
  }

  return [];
}
