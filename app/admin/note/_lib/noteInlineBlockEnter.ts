import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import type { NoteBlock } from './types';

export function createInlineBlockEnterHandler(options: {
  block: NoteBlock;
  followType: NoteBlock['type'];
  text: string;
  isEmpty?: (rawText: string, enterCtx?: NoteEditorEnterContext) => boolean;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
}) {
  const resolveEmpty = options.isEmpty
    ?? ((rawText: string, enterCtx?: NoteEditorEnterContext) =>
      enterCtx?.isEmpty ?? rawText.trim().length === 0);

  return (enterCtx?: NoteEditorEnterContext) => {
    if (enterCtx?.split) {
      options.onAddBelow(options.followType, {
        text: enterCtx.split.afterText,
        html: enterCtx.split.afterHtml,
        depth: 0,
      });
      return;
    }

    const rawText = options.text;
    const isEmpty = resolveEmpty(rawText, enterCtx);
    if (!isEmpty) {
      options.onAddBelow(options.followType);
      return;
    }

    if (options.block.parent_block_id) {
      options.onIndentChange?.('out');
      return;
    }

    options.onChangeType?.('text');
  };
}
