import { defaultBlockContent } from './constants';
import type { NoteBlock } from './types';

const MULTILINE_PASTE_SPLIT_TYPES = new Set<NoteBlock['type']>([
  'text',
  'heading',
  'heading2',
  'heading3',
  'todo',
  'callout',
  'bulletList',
  'numberedList',
]);

export function canSplitMultilinePasteToBlocks(blockType: string): boolean {
  return MULTILINE_PASTE_SPLIT_TYPES.has(blockType as NoteBlock['type']);
}

/** 제목 블록 뒤 줄은 일반 문단으로 */
export function insertTypeForMultilinePasteFollowUp(blockType: NoteBlock['type']): NoteBlock['type'] {
  if (blockType === 'heading' || blockType === 'heading2' || blockType === 'heading3') return 'text';
  return blockType;
}

export function contentForMultilinePasteLine(
  blockType: NoteBlock['type'],
  line: string,
  sourceContent: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base = defaultBlockContent(blockType) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base, text: line };
  if (blockType === 'todo') next.checked = false;
  if (sourceContent?.placedInToggle === true) next.placedInToggle = true;
  if (sourceContent?.createdInsideToggle === true) next.createdInsideToggle = true;
  return next;
}
