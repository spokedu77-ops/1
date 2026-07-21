import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';

/** 문서 편집 연산 — 로컬 reducer가 처리하는 단위 */
export type NoteDocumentOp =
  | { type: 'replaceBlocks'; blocks: NoteBlock[] }
  | { type: 'updateContent'; blockId: string; content: Record<string, unknown> }
  | { type: 'applyPatches'; patches: NoteBlockFieldPatch[] }
  | { type: 'syncFromServer'; blocks: NoteBlock[] };

/** 서버에 순차 반영할 영속 연산 */
export type NotePersistOp =
  | {
    type: 'patchContent';
    updates: Array<{
      id: string;
      content: Record<string, unknown>;
      baseContent?: Record<string, unknown>;
    }>;
  }
  | { type: 'patchFields'; patches: NoteBlockFieldPatch[] }
  | { type: 'softDelete'; ids: string[]; blocks?: NoteBlock[] }
  | {
    type: 'createBlock';
    id: string;
    documentId: string;
    blockType: NoteBlock['type'];
    content: Record<string, unknown>;
    order_index?: number;
    parent_block_id: string | null;
    normalizeOrders?: Array<{ id: string; order_index: number }>;
    transactionUpdates?: NoteBlockFieldPatch[];
    allowEmptyVisibleCreate?: boolean;
  }
  | {
    type: 'blockTransaction';
    patches: NoteBlockFieldPatch[];
    deleteIds: string[];
    deletedBlocks?: NoteBlock[];
    creates?: Array<{
      id: string;
      document_id: string;
      parent_block_id: string | null;
      type: NoteBlock['type'];
      order_index: number;
      content: Record<string, unknown>;
    }>;
  }
  | { type: 'purgeBlock'; id: string };

export type NoteDocumentEngineState = {
  documentId: string;
  blocks: NoteBlock[];
};
