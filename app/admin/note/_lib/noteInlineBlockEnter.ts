import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import { getMergedBlockContentBase } from './noteBlockContentResolve';
import type { NoteBlock } from './types';
import {
  resolveHeadingEnterAction,
  resolveInlineBlockEnterAction,
} from './noteNotionBlockBehavior';

export function createInlineBlockEnterHandler(options: {
  block: NoteBlock;
  followType: NoteBlock['type'];
  text: string;
  isEmpty?: (rawText: string, enterCtx?: NoteEditorEnterContext) => boolean;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
}) {
  return (enterCtx?: NoteEditorEnterContext) => {
    const liveContent = getMergedBlockContentBase(options.block);
    const liveText = typeof liveContent.text === 'string' ? liveContent.text : (options.text ?? '');
    const action = resolveInlineBlockEnterAction({
      followType: options.followType,
      text: liveText,
      parentBlockId: options.block.parent_block_id ?? null,
      enterCtx,
      isEmpty: options.isEmpty,
    });

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
  };
}

export function createHeadingEnterHandler(options: {
  block: NoteBlock;
  text: string;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
}) {
  return (enterCtx?: NoteEditorEnterContext) => {
    const liveContent = getMergedBlockContentBase(options.block);
    const liveText = typeof liveContent.text === 'string' ? liveContent.text : (options.text ?? '');
    const action = resolveHeadingEnterAction({
      text: liveText,
      parentBlockId: options.block.parent_block_id ?? null,
      enterCtx,
    });

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
  };
}
