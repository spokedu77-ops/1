import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';

/** 스토어(편집 중) 우선, 없으면 React prop content */
export function getMergedBlockContentBase(
  block: Pick<NoteBlock, 'id' | 'content'>,
): Record<string, unknown> {
  const fromStore = useNoteBlockStore.getState().getBlock(block.id)?.content;
  return (fromStore ?? block.content ?? {}) as Record<string, unknown>;
}
