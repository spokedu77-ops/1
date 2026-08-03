import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import type { NoteEditorEnterResult } from '../_components/NoteEditor';
import { getMergedBlockContentBase } from './noteBlockContentResolve';
import { readTodoListNestLevel } from './noteTodoContent';
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
  onAddBelow: (
    type?: NoteBlock['type'],
    content?: Record<string, unknown>,
  ) => NoteEditorEnterResult;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
};

type HeadingEnterHandlerOptions = {
  block: NoteBlock;
  text: string;
  onAddBelow: (
    type?: NoteBlock['type'],
    content?: Record<string, unknown>,
  ) => NoteEditorEnterResult;
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
): NoteEditorEnterResult {
  switch (action.kind) {
  case 'add-below':
    return options.onAddBelow(action.followType, action.content);
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
  return (enterCtx?: NoteEditorEnterContext): NoteEditorEnterResult => {
    if (
      options.followType === 'text'
      && enterCtx?.split
    ) {
      const hint = consumeNoteMergeSplitHint(
        options.block.id,
        enterCtx.split.beforeText.length,
      );
      if (hint) {
        return options.onAddBelow(hint.blockType, {
          text: enterCtx.split.afterText,
          html: enterCtx.split.afterHtml,
        });
      }
    }

    const action = resolveInlineBlockEnterAction({
      followType: options.followType,
      text: liveTextForBlock(options.block, options.text ?? ''),
      parentBlockId: options.block.parent_block_id ?? null,
      parentBlockType: options.parentBlockType ?? null,
      listNestLevel: options.followType === 'todo'
        ? readTodoListNestLevel(getMergedBlockContentBase(options.block))
        : 0,
      enterCtx,
      isEmpty: options.isEmpty,
    });

    return runInlineEnterAction(action, options);
  };
}

export function createHeadingEnterHandler(options: HeadingEnterHandlerOptions) {
  return (enterCtx?: NoteEditorEnterContext): NoteEditorEnterResult => {
    const action = resolveHeadingEnterAction({
      text: liveTextForBlock(options.block, options.text ?? ''),
      parentBlockId: options.block.parent_block_id ?? null,
      enterCtx,
    });

    return runInlineEnterAction(action, options);
  };
}
