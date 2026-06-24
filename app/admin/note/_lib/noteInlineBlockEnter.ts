import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import type { NoteBlock } from './types';
import {
  resolveHeadingEnterAction,
  resolveInlineBlockEnterAction,
  resolveToggleBodyEnterAction,
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
    const action = resolveInlineBlockEnterAction({
      followType: options.followType,
      text: options.text,
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
    const action = resolveHeadingEnterAction({
      text: options.text,
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

export function createToggleBodyEnterHandler(options: {
  onAddChildBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
}) {
  return (enterCtx?: NoteEditorEnterContext) => {
    const action = resolveToggleBodyEnterAction(enterCtx);
    options.onAddChildBelow(action.blockType, action.content);
  };
}
