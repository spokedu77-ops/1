import {
  canSplitMultilinePasteToBlocks,
  contentForMultilinePasteLine,
  insertTypeForMultilinePasteFollowUp,
} from './noteMultilinePaste';
import type { NoteBlock } from './types';

export type PastedBlockSpec = {
  type: NoteBlock['type'];
  text: string;
  html?: string;
  checked?: boolean;
};

export function pastedBlocksFromPlainLines(
  blockType: NoteBlock['type'],
  lines: string[],
): PastedBlockSpec[] {
  const followType = insertTypeForMultilinePasteFollowUp(blockType);
  return lines.map((line, index) => ({
    type: index === 0 ? blockType : followType,
    text: line,
  }));
}

export function contentForPastedBlock(
  spec: PastedBlockSpec,
  sourceContent: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = contentForMultilinePasteLine(spec.type, spec.text, sourceContent);
  if (spec.html?.trim()) next.html = spec.html;
  if (spec.type === 'todo') next.checked = spec.checked ?? false;
  return next;
}

export { canSplitMultilinePasteToBlocks as canSplitPasteToBlocks };
