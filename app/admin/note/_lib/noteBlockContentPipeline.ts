import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  contentChangeNeedsReactBlocks,
  contentChangedForUndo,
} from './noteContentPatch';
import type { NoteBlock } from './types';

export function normalizeBlockContentRecord(
  block: NoteBlock,
  content: unknown,
): Record<string, unknown> {
  let record = (content ?? {}) as Record<string, unknown>;
  if (block.type === 'bulletList' || block.type === 'numberedList') {
    record = normalizeListBlockContentRecord(record);
  }
  return record;
}

export type ApplyBlockContentChangeArgs = {
  block: NoteBlock;
  content: unknown;
  blocksRef: MutableRefObject<NoteBlock[]>;
  setBlocks: Dispatch<SetStateAction<NoteBlock[]>>;
  recordContentUndoBeforeChange: (blockId: string) => void;
  scheduleBlockContentSave: (blockId: string, content: unknown) => void;
  onAfterChange?: () => void;
};

/**
 * 블록 content 갱신 단일 경로 — 스토어·blocksRef·(필요 시) React state를 한 번에 맞춘다.
 */
export function applyBlockContentChange({
  block,
  content,
  blocksRef,
  setBlocks,
  recordContentUndoBeforeChange,
  scheduleBlockContentSave,
  onAfterChange,
}: ApplyBlockContentChangeArgs): void {
  const nextRecord = normalizeBlockContentRecord(block, content);
  const prevRecord = (block.content ?? {}) as Record<string, unknown>;

  if (contentChangedForUndo(prevRecord, nextRecord)) {
    recordContentUndoBeforeChange(block.id);
  }

  const store = useNoteBlockStore.getState();
  if (!store.getBlock(block.id)) {
    store.upsertBlock(block);
  }
  store.patchContent(block.id, nextRecord);

  blocksRef.current = blocksRef.current.map((item) =>
    item.id === block.id ? { ...item, content: nextRecord } : item,
  );

  scheduleBlockContentSave(block.id, nextRecord);
  onAfterChange?.();

  if (!contentChangeNeedsReactBlocks(prevRecord, nextRecord)) {
    return;
  }

  setBlocks((prev) =>
    prev.map((item) => (item.id === block.id ? { ...item, content: nextRecord } : item)),
  );
}
