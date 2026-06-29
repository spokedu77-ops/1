import type { NoteBlock } from './types';

export type NoteMergeSplitHint = {
  blockId: string;
  offset: number;
  blockType: NoteBlock['type'];
};

const hintsByBlockId = new Map<string, NoteMergeSplitHint>();

export function setNoteMergeSplitHint(hint: NoteMergeSplitHint) {
  hintsByBlockId.set(hint.blockId, hint);
}

export function consumeNoteMergeSplitHint(
  blockId: string,
  offset: number,
): NoteMergeSplitHint | null {
  const hint = hintsByBlockId.get(blockId);
  if (!hint || hint.offset !== offset) return null;
  hintsByBlockId.delete(blockId);
  return hint;
}

export function clearNoteMergeSplitHint(blockId: string) {
  hintsByBlockId.delete(blockId);
}
