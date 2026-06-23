import { stripListItemMarkerPrefix } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import type { NoteBlock } from './types';

export type NoteListBlockHandlerContext = {
  block: NoteBlock;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onRequestCaretOffset?: (offset: number) => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
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
    if (enterCtx?.split) {
      ctx.onAddBelow(listType, {
        text: enterCtx.split.afterText,
        html: enterCtx.split.afterHtml,
        depth: 0,
      });
      return;
    }
    const rawText = listItemText();
    const isEmpty = enterCtx?.isEmpty ?? rawText.trim().length === 0;
    if (!isEmpty) {
      ctx.onAddBelow(listType);
      return;
    }
    if (ctx.block.parent_block_id) {
      ctx.onIndentChange?.('out');
      return;
    }
    ctx.onChangeType('text');
  };

  return {
    handleListItemBackspaceAtStart,
    handleListItemEmptyBackspace,
    handleListItemEnter,
  };
}
