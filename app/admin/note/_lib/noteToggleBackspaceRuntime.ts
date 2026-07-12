import type { MutableRefObject } from 'react';
import { planMergeWithPreviousBlock } from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';
import {
  createNotionEmptyBackspaceHandler,
  isFirstChildAmongSiblings,
  readToggleTitleText,
  resolveToggleChildBackspaceAtStartAction,
  resolveToggleChildEmptyBackspaceAction,
} from './noteNotionBlockBehavior';

export type NoteToggleBackspaceRuntime = {
  blocksRef: MutableRefObject<NoteBlock[]>;
  focusBlockEditor: (blockId: string | null, part?: 'title' | 'editor', caretOffset?: number) => void;
  handleDeleteBlock: (block: NoteBlock, focusPrevious?: boolean) => void | Promise<void>;
  handleMergeWithPreviousBlock: (block: NoteBlock) => void | Promise<void>;
};

let runtime: NoteToggleBackspaceRuntime | null = null;

const emptyBackspaceHandlers = new Map<string, () => void>();
const backspaceAtStartHandlers = new Map<string, () => boolean>();

export function setNoteToggleBackspaceRuntime(next: NoteToggleBackspaceRuntime | null) {
  runtime = next;
}

function resolveToggleChildContext(block: NoteBlock) {
  const blocks = runtime?.blocksRef.current ?? [];
  const parentId = block.parent_block_id ?? null;
  const parent = parentId ? blocks.find((item) => item.id === parentId) : null;
  const parentBlockType = parent?.type ?? null;
  const isFirstChildInToggle = parentBlockType === 'toggle'
    && parentId != null
    && isFirstChildAmongSiblings(blocks, block.id, parentId);
  return { parent, parentBlockType, isFirstChildInToggle };
}

function focusParentToggleTitle(block: NoteBlock) {
  const { parent } = resolveToggleChildContext(block);
  if (!parent || parent.type !== 'toggle') return;
  const title = readToggleTitleText(parent.content as Record<string, unknown>);
  runtime?.focusBlockEditor(parent.id, 'title', title.length);
}

export function invokeToggleChildEmptyBackspace(blockId: string) {
  if (!runtime) return;
  const block = runtime.blocksRef.current.find((item) => item.id === blockId);
  if (!block) return;

  const canMergeWithPrevious = () => !!planMergeWithPreviousBlock(runtime!.blocksRef.current, block.id);
  const { parentBlockType, isFirstChildInToggle } = resolveToggleChildContext(block);
  const action = resolveToggleChildEmptyBackspaceAction({
    parentBlockType,
    isFirstChildInToggle,
    canMergeWithPrevious: canMergeWithPrevious(),
  });

  if (action.kind === 'delete-and-focus-toggle-title') {
    void Promise.resolve(runtime.handleDeleteBlock(block, false)).then(() => {
      requestAnimationFrame(() => focusParentToggleTitle(block));
    });
    return;
  }

  createNotionEmptyBackspaceHandler({
    canMergeWithPrevious,
    onMergeWithPrevious: () => { void runtime!.handleMergeWithPreviousBlock(block); },
    onDeleteEmptyBlock: () => { void runtime!.handleDeleteBlock(block, true); },
  })();
}

export function invokeToggleChildBackspaceAtStart(blockId: string): boolean {
  if (!runtime) return false;
  const block = runtime.blocksRef.current.find((item) => item.id === blockId);
  if (!block) return false;

  const { parentBlockType, isFirstChildInToggle } = resolveToggleChildContext(block);
  const action = resolveToggleChildBackspaceAtStartAction({
    parentBlockType,
    isFirstChildInToggle,
  });
  if (action.kind === 'focus-toggle-title') {
    requestAnimationFrame(() => focusParentToggleTitle(block));
    return true;
  }
  return false;
}

/** 블록 id당 핸들러 참조 고정 — memo row가 backspace 콜백 교체를 막아도 런타임은 최신 blocksRef 사용 */
export function getStableToggleEmptyBackspaceHandler(blockId: string): () => void {
  let handler = emptyBackspaceHandlers.get(blockId);
  if (!handler) {
    handler = () => invokeToggleChildEmptyBackspace(blockId);
    emptyBackspaceHandlers.set(blockId, handler);
  }
  return handler;
}

export function getStableToggleBackspaceAtStartHandler(blockId: string): () => boolean {
  let handler = backspaceAtStartHandlers.get(blockId);
  if (!handler) {
    handler = () => invokeToggleChildBackspaceAtStart(blockId);
    backspaceAtStartHandlers.set(blockId, handler);
  }
  return handler;
}

export function clearStableToggleBackspaceHandlers(blockIds: Iterable<string>) {
  for (const id of blockIds) {
    emptyBackspaceHandlers.delete(id);
    backspaceAtStartHandlers.delete(id);
  }
}
