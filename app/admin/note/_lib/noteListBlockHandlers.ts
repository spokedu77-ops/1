import { stripListItemMarkerPrefix } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import {
  resolveInlineBlockEnterAction,
  resolveListBackspaceAtStartAction,
  resolveListEmptyBackspaceAction,
} from './noteNotionBlockBehavior';
import type { NoteBlock } from './types';

export type NoteListBlockHandlerContext = {
  block: NoteBlock;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onRequestCaretOffset?: (offset: number) => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSplitWithChildren?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  canMergeWithPrevious?: () => boolean;
  onMergeWithPrevious?: () => void;
};

function runListBackspaceAction(
  action: ReturnType<typeof resolveListBackspaceAtStartAction>,
  ctx: Pick<NoteListBlockHandlerContext, 'onIndentChange' | 'onChangeType' | 'onRequestCaretOffset' | 'onMergeWithPrevious'>,
) {
  switch (action.kind) {
  case 'outdent':
    ctx.onIndentChange?.('out');
    return;
  case 'merge-with-previous':
    ctx.onMergeWithPrevious?.();
    return;
  case 'convert-to-text':
    ctx.onRequestCaretOffset?.(0);
    ctx.onChangeType('text');
    return;
  default: {
    const _exhaustive: never = action;
    return _exhaustive;
  }
  }
}

export function createNoteListBlockHandlers(ctx: NoteListBlockHandlerContext) {
  const listItemText = () => {
    const fromStore = useNoteBlockStore.getState().getBlock(ctx.block.id)?.content?.text;
    const raw = typeof fromStore === 'string'
      ? fromStore
      : (typeof ctx.block.content?.text === 'string' ? ctx.block.content.text : '');
    return stripListItemMarkerPrefix(raw);
  };

  const parentBlockId = () => ctx.block.parent_block_id ?? null;

  const handleListItemBackspaceAtStart = (): boolean => {
    if (ctx.block.type !== 'bulletList' && ctx.block.type !== 'numberedList') return false;
    const action = resolveListBackspaceAtStartAction({
      itemText: listItemText(),
      parentBlockId: parentBlockId(),
      canMergeWithPrevious: ctx.canMergeWithPrevious?.() ?? false,
    });
    runListBackspaceAction(action, ctx);
    return true;
  };

  const handleListItemEmptyBackspace = () => {
    runListBackspaceAction(resolveListEmptyBackspaceAction(parentBlockId()), ctx);
  };

  const handleListItemEnter = (
    listType: 'bulletList' | 'numberedList',
    enterCtx?: NoteEditorEnterContext,
  ) => {
    const action = resolveInlineBlockEnterAction({
      followType: listType,
      text: listItemText(),
      parentBlockId: parentBlockId(),
      enterCtx,
    });

    switch (action.kind) {
    case 'add-below':
      if (!enterCtx?.split && ctx.onSplitWithChildren) {
        ctx.onSplitWithChildren(action.followType, action.content);
        return;
      }
      ctx.onAddBelow(action.followType, action.content);
      return;
    case 'outdent':
      ctx.onIndentChange?.('out');
      return;
    case 'convert-to-text':
      ctx.onChangeType('text');
      return;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
    }
  };

  return {
    handleListItemBackspaceAtStart,
    handleListItemEmptyBackspace,
    handleListItemEnter,
  };
}
