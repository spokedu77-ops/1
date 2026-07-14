import type { MutableRefObject } from 'react';
import { normalizeTodoBlockContentRecord } from './noteTodoContent';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  contentChangedForUndo,
  mergeContentPatchWithActiveStore,
} from './noteContentPatch';
import type { NoteBlock } from './types';

export function normalizeBlockContentRecord(
  block: NoteBlock,
  content: unknown,
): Record<string, unknown> {
  let record = (content ?? {}) as Record<string, unknown>;
  if (block.type === 'todo') {
    record = normalizeTodoBlockContentRecord(record);
  }
  return record;
}

export type ApplyBlockContentChangeArgs = {
  block: NoteBlock;
  content: unknown;
  blocksRef: MutableRefObject<NoteBlock[]>;
  recordContentUndoBeforeChange: (blockId: string) => void;
  /**
   * LocalApply + outbound — 반드시 pipeline.scheduleContentPatch
   * (dispatch patchContent) 경로. store 직패치 금지.
   */
  scheduleBlockContentSave: (
    blockId: string,
    content: unknown,
    baseContent?: Record<string, unknown>,
  ) => void;
  onAfterChange?: () => void;
};

/**
 * 블록 content Intent 단일 경로.
 * LocalApply는 scheduleBlockContentSave → pipeline.dispatch(patchContent)만.
 */
export function applyBlockContentChange({
  block,
  content,
  blocksRef,
  recordContentUndoBeforeChange,
  scheduleBlockContentSave,
  onAfterChange,
}: ApplyBlockContentChangeArgs): void {
  const store = useNoteBlockStore.getState();
  if (!store.getBlock(block.id)) {
    store.upsertBlock(blocksRef.current.find((item) => item.id === block.id) ?? block);
  }
  const storeContent = store.getBlock(block.id)?.content as Record<string, unknown> | undefined;
  const refContent = blocksRef.current.find((item) => item.id === block.id)?.content as
    | Record<string, unknown>
    | undefined;
  const prevRecord = (storeContent ?? refContent ?? block.content ?? {}) as Record<string, unknown>;

  const incoming = normalizeBlockContentRecord(block, content);
  const nextRecord = mergeContentPatchWithActiveStore(incoming, prevRecord);

  if (contentChangedForUndo(prevRecord, nextRecord)) {
    recordContentUndoBeforeChange(block.id);
  }

  scheduleBlockContentSave(block.id, nextRecord, prevRecord);
  onAfterChange?.();
}
