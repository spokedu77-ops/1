import { LIST_CONTAINER_TYPES } from '@/app/lib/note/noteBlockTree';
import { COLUMN_TYPE } from './noteColumnBlock';
import type { NoteBlock } from './types';

export function isPageLinkBlock(block: Pick<NoteBlock, 'type'>): boolean {
  return block.type === 'page';
}

export function isToggleBlock(block: Pick<NoteBlock, 'type'>): boolean {
  return block.type === 'toggle';
}

export function isTodoBlock(block: Pick<NoteBlock, 'type'>): boolean {
  return block.type === 'todo';
}

export function supportsInsideDropTarget(type: string): boolean {
  return isToggleBlock({ type })
    || type === 'page'
    || type === COLUMN_TYPE
    || LIST_CONTAINER_TYPES.has(type);
}

export function allowsLocalChildBlocks(block: Pick<NoteBlock, 'type'>): boolean {
  return !isPageLinkBlock(block);
}
