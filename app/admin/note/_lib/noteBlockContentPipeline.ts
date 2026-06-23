import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  contentChangeNeedsReactBlocks,
  contentChangedForUndo,
  mergeContentPatchWithActiveStore,
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
