import type { MutableRefObject } from 'react';
import { planMergeWithPreviousBlock } from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';
import {
  isFirstChildAmongSiblings,
  readToggleTitleText,
  resolveEmptyBackspaceAction,
  resolveInlineBackspaceAtStartAction,
  resolveToggleChildBackspaceAtStartAction,
  resolveToggleChildEmptyBackspaceAction,
} from './noteNotionBlockBehavior';

export type NoteToggleBackspaceRuntime = {
  blocksRef: MutableRefObject<NoteBlock[]>;
  focusBlockEditor: (blockId: string | null, part?: 'title' | 'editor', caretOffset?: number) => void;
  handleDeleteBlock: (block: NoteBlock, focusPrevious?: boolean) => void | Promise<void>;
  handleMergeWithPreviousBlock: (block: NoteBlock) => void | Promise<void>;
  handleChangeBlockType: (
    block: NoteBlock,
    type: NoteBlock['type'],
    options?: { contentOverride?: Record<string, unknown> },
  ) => void | Promise<void>;
};

let runtime: NoteToggleBackspaceRuntime | null = null;

const emptyBackspaceHandlers = new Map<string, () => void>();
const backspaceAtStartHandlers = new Map<string, () => boolean>();

export function setNoteToggleBackspaceRuntime(next: NoteToggleBackspaceRuntime | null) {
  runtime = next;
}

/** store 우선 — type 변경 직후 blocksRef effect 지연으로 stale todo가 남지 않게 */
function resolveLiveBlock(blockId: string): NoteBlock | undefined {
  if (!runtime) return undefined;
  const fromStore = useNoteBlockStore.getState().getBlock(blockId);
  if (fromStore) return fromStore;
  return runtime.blocksRef.current.find((item) => item.id === blockId);
}

function liveBlocksForDocument(documentId: string): NoteBlock[] {
  if (!runtime) return [];
  const fromStore = useNoteBlockStore.getState().getBlocksArray()
    .filter((block) => block.document_id === documentId);
  if (fromStore.length > 0) return fromStore;
  return runtime.blocksRef.current.filter((block) => block.document_id === documentId);
}

function resolveToggleChildContext(block: NoteBlock) {
  const blocks = liveBlocksForDocument(block.document_id);
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

/**
 * 빈 블록 Backspace — 부모/하위 문서 공통 SSOT.
 * 1) todo 등 decorated → text (커서 유지)
 * 2) 빈 text → merge/delete (블록 제거)
 */
export function invokeToggleChildEmptyBackspace(blockId: string) {
  if (!runtime) return;
  const block = resolveLiveBlock(blockId);
  if (!block) return;

  const canMerge = !!planMergeWithPreviousBlock(liveBlocksForDocument(block.document_id), block.id);

  const action = resolveEmptyBackspaceAction({
    blockType: block.type,
    canMergeWithPrevious: canMerge,
  });

  if (action.kind === 'convert-to-text') {
    // TipTap은 이미 비어 있어도 store/debounce에 옛 본문이 남아 remount로 되살아날 수 있다.
    // type→text 와 함께 본문을 비워 두 번째 Backspace가 삭제로 이어지게 한다.
    const store = useNoteBlockStore.getState();
    const live = store.getBlock(blockId) ?? block;
    const emptyContent = { text: '', html: '<p></p>' };
    store.applyBlocks((blocks) => blocks.map((item) => (
      item.id === blockId
        ? { ...item, type: 'text' as const, content: emptyContent }
        : item
    )));
    void runtime.handleChangeBlockType(
      { ...live, type: live.type },
      'text',
      { contentOverride: emptyContent },
    );
    return;
  }

  const { parentBlockType, isFirstChildInToggle } = resolveToggleChildContext(block);
  const toggleAction = resolveToggleChildEmptyBackspaceAction({
    parentBlockType,
    isFirstChildInToggle,
    canMergeWithPrevious: canMerge,
  });
  if (toggleAction.kind === 'delete-and-focus-toggle-title') {
    void Promise.resolve(runtime.handleDeleteBlock(block, false)).then(() => {
      requestAnimationFrame(() => focusParentToggleTitle(block));
    });
    return;
  }

  if (action.kind === 'merge-with-previous') {
    void runtime.handleMergeWithPreviousBlock(block);
    return;
  }
  void runtime.handleDeleteBlock(block, true);
}

export function invokeToggleChildBackspaceAtStart(blockId: string): boolean {
  if (!runtime) return false;
  const block = resolveLiveBlock(blockId);
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
  if (resolveInlineBackspaceAtStartAction(block.type).kind === 'convert-to-text') {
    void runtime.handleChangeBlockType(block, 'text');
    return true;
  }
  return false;
}

/** 블록 id당 핸들러 참조 고정 — memo row가 backspace 콜백 교체를 막아도 런타임은 최신 store 사용 */
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
