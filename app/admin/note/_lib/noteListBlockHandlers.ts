import { stripListItemMarkerPrefix } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import { resolveInlineBlockEnterAction } from './noteNotionBlockBehavior';
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

export function createNoteListBlockHandlers(ctx: NoteListBlockHandlerContext) {
  const listItemText = () => {
    const fromStore = useNoteBlockStore.getState().getBlock(ctx.block.id)?.content?.text;
    const raw = typeof fromStore === 'string'
      ? fromStore
      : (typeof ctx.block.content?.text === 'string' ? ctx.block.content.text : '');
    return stripListItemMarkerPrefix(raw);
  };

  const handleListItemBackspaceAtStart = (): boolean => {
    if (ctx.block.type !== 'bulletList' && ctx.block.type !== 'numberedList') return false;
    const itemText = listItemText();
    if (itemText.length === 0) {
      if (ctx.block.parent_block_id) {
        ctx.onIndentChange?.('out');
      } else {
        ctx.onChangeType('text');
      }
      return true;
    }
    if (ctx.canMergeWithPrevious?.()) {
      ctx.onMergeWithPrevious?.();
      return true;
    }
    if (ctx.block.parent_block_id) {
      ctx.onIndentChange?.('out');
      return true;
    }
    ctx.onRequestCaretOffset?.(0);
    ctx.onChangeType('text');
    return true;
  };

  const handleListItemEmptyBackspace = () => {
    if (ctx.block.parent_block_id) {
      ctx.onIndentChange?.('out');
      return;
    }
    ctx.onChangeType('text');
  };

  const handleListItemEnter = (
    listType: 'bulletList' | 'numberedList',
    enterCtx?: NoteEditorEnterContext,
  ) => {
    const action = resolveInlineBlockEnterAction({
      followType: listType,
      text: listItemText(),
      parentBlockId: ctx.block.parent_block_id ?? null,
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
