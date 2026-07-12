import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import { getMergedBlockContentBase } from './noteBlockContentResolve';
import {
  resolveHeadingEnterAction,
  resolveInlineBlockEnterAction,
} from './noteNotionBlockBehavior';
import { consumeNoteMergeSplitHint } from './noteMergeSplitHint';
import type { NoteBlock } from './types';

type InlineEnterHandlerOptions = {
  block: NoteBlock;
  followType: NoteBlock['type'];
  text: string;
  parentBlockType?: NoteBlock['type'] | null;
  isEmpty?: (rawText: string, enterCtx?: NoteEditorEnterContext) => boolean;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
};

type HeadingEnterHandlerOptions = {
  block: NoteBlock;
  text: string;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
};

function liveTextForBlock(block: NoteBlock, fallbackText: string): string {
  const liveContent = getMergedBlockContentBase(block);
  return typeof liveContent.text === 'string' ? liveContent.text : fallbackText;
}

function runInlineEnterAction(
  action: ReturnType<typeof resolveInlineBlockEnterAction>,
  options: Pick<InlineEnterHandlerOptions, 'onAddBelow' | 'onChangeType' | 'onIndentChange'>,
) {
  switch (action.kind) {
  case 'add-below':
    options.onAddBelow(action.followType, action.content);
    return;
  case 'outdent':
    options.onIndentChange?.('out');
    return;
  case 'convert-to-text':
    options.onChangeType?.('text');
    return;
  default: {
    const _exhaustive: never = action;
    return _exhaustive;
  }
  }
}

export function createInlineBlockEnterHandler(options: InlineEnterHandlerOptions) {
  return (enterCtx?: NoteEditorEnterContext) => {
    if (
      options.followType === 'text'
      && enterCtx?.split
    ) {
      const hint = consumeNoteMergeSplitHint(
        options.block.id,
        enterCtx.split.beforeText.length,
      );
      if (hint) {
        options.onAddBelow(hint.blockType, {
          text: enterCtx.split.afterText,
          html: enterCtx.split.afterHtml,
        });
        return;
      }
    }

    const action = resolveInlineBlockEnterAction({
      followType: options.followType,
      text: liveTextForBlock(options.block, options.text ?? ''),
      parentBlockId: options.block.parent_block_id ?? null,
      parentBlockType: options.parentBlockType ?? null,
      enterCtx,
      isEmpty: options.isEmpty,
    });

    runInlineEnterAction(action, options);
  };
}

export function createHeadingEnterHandler(options: HeadingEnterHandlerOptions) {
  return (enterCtx?: NoteEditorEnterContext) => {
    const action = resolveHeadingEnterAction({
      text: liveTextForBlock(options.block, options.text ?? ''),
      parentBlockId: options.block.parent_block_id ?? null,
      enterCtx,
    });

    runInlineEnterAction(action, options);
  };
}
