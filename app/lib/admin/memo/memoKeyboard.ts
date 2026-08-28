import type { MemoBlockRow } from './types';

export function getSiblingBlocks(
  blocks: MemoBlockRow[],
  parentBlockId: string | null,
): MemoBlockRow[] {
  return blocks
    .filter((b) =>
      parentBlockId ? b.parent_block_id === parentBlockId : b.parent_block_id === null,
    )
    .sort((a, b) => a.order_index - b.order_index);
}

export function rangeSelectSiblingIds(
  blocks: MemoBlockRow[],
  parentBlockId: string | null,
  anchorId: string,
  targetId: string,
): string[] {
  const siblings = getSiblingBlocks(blocks, parentBlockId);
  const ids = siblings.map((b) => b.id);
  const a = ids.indexOf(anchorId);
  const b = ids.indexOf(targetId);
  if (a < 0 || b < 0) return [targetId];
  const [start, end] = a < b ? [a, b] : [b, a];
  return ids.slice(start, end + 1);
}

export function parsePlainTextPasteLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
}

export function shouldDeleteBlockOnBackspace(
  content: string,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  if (content.length > 0) return false;
  return selectionStart === 0 && selectionEnd === 0;
}

export function shouldDeleteSelectedText(
  content: string,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  return selectionStart !== selectionEnd;
}
