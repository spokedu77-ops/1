import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildNoteHistoryInverse,
  type NoteHistoryEntry,
} from '../_hooks/useNoteBlockUndo';
import {
  applyRestoreBlockSnapshots,
  mergeBlocksWithStoreContent,
  mergeReconciledBlocks,
} from './noteBlockStateMerge';
import { normalizeLoadedNoteBlocks } from '../_components/noteBulletInput';
import { buildContentForTypeChange, getBlockedTypeChangeReason, filterTurnIntoCommands } from './noteBlockTypeChange';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';
import { buildMoveBlockCommand } from './noteBlockCommands';
import {
  getBlocksInParent,
  planBlockTabIndent,
  resolveVisualNavigateTarget,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';

const block = (
  id: string,
  text: string,
  opts: Partial<NoteBlock> = {},
): NoteBlock => ({
  id,
  document_id: 'doc',
  type: 'text',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
  ...opts,
});

/** handleIndentBlock Tab undo id 수집과 동일 */
function collectTabUndoBlockIds(
  prevBlocks: NoteBlock[],
  moving: NoteBlock,
  tabPlan: NonNullable<ReturnType<typeof planBlockTabIndent>>,
): string[] {
  const oldParentId = moving.parent_block_id ?? null;
  const undoIds = new Set<string>([moving.id]);
  getBlocksInParent(prevBlocks, oldParentId).forEach((item) => undoIds.add(item.id));
  if (tabPlan.targetParentId) {
    getBlocksInParent(prevBlocks, tabPlan.targetParentId).forEach((item) => undoIds.add(item.id));
  } else {
    sortRootBlocks(prevBlocks).forEach((item) => undoIds.add(item.id));
  }
  return [...undoIds];
}

describe('Tab indent undo roundtrip', () => {
  it('Ctrl+Z restores nested bullet back to root after Tab in', () => {
    const prevBlocks = [
      block('a', 'A', { type: 'bulletList', order_index: 0 }),
      block('b', 'B', { type: 'bulletList', order_index: 1 }),
    ];
    const tabPlan = planBlockTabIndent(prevBlocks, 'b', 'in');
    expect(tabPlan?.targetParentId).toBe('a');

    const undoIds = collectTabUndoBlockIds(prevBlocks, prevBlocks[1], tabPlan!);
    const snapshots = prevBlocks
      .filter((b) => undoIds.includes(b.id))
      .map((b) => ({ ...b }));

    const afterTab = buildMoveBlockCommand(prevBlocks, 'b', tabPlan!).nextBlocks;
    expect(afterTab.find((b) => b.id === 'b')?.parent_block_id).toBe('a');

    const entry: NoteHistoryEntry = { kind: 'restore-blocks', snapshots };
    const inverse = buildNoteHistoryInverse(entry, afterTab);
    expect(inverse?.kind).toBe('restore-blocks');
    if (inverse?.kind === 'restore-blocks') {
      expect(inverse.snapshots.find((b: NoteBlock) => b.id === 'b')?.parent_block_id).toBe('a');
    }

    const restored = applyRestoreBlockSnapshots(afterTab, entry.snapshots);
    expect(restored.find((b) => b.id === 'b')?.parent_block_id).toBeNull();
    expect(restored.find((b) => b.id === 'b')?.order_index).toBe(1);
  });
});

describe('reconcile + typing (stale blocksRef)', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId(null);
    useNoteBlockStore.getState().setActiveEditor(null);
    useNoteBlockStore.getState().hydrate([]);
  });

  it('keeps store text when blocksRef is stale but user typed in store', () => {
    const loaded = [block('a', 'loaded')];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    useNoteBlockStore.getState().hydrate(loaded);
    useNoteBlockStore.getState().patchContent('a', { text: 'typing now' });

    const staleRef = loaded;
    const serverReconcile = [block('a', 'loaded')];
    const merged = mergeReconciledBlocks(staleRef, serverReconcile);

    expect(merged[0].content?.text).toBe('typing now');
  });

  it('preserves text through setBlocks merge after Tab changed structure', () => {
    const afterTab = [
      block('a', 'A', { type: 'bulletList', order_index: 0 }),
      block('b', 'B', { type: 'bulletList', order_index: 0, parent_block_id: 'a' }),
    ];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate(afterTab);
    useNoteBlockStore.getState().patchContent('b', { text: 'edited nested' });

    const merged = mergeBlocksWithStoreContent(afterTab);
    expect(merged.find((b) => b.id === 'b')?.content?.text).toBe('edited nested');
  });
});

describe('sub-document store isolation', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId(null);
    useNoteBlockStore.getState().setActiveEditor(null);
    useNoteBlockStore.getState().hydrate([]);
  });

  it('does not merge parent store content into child document blocks', () => {
    const parentBlock = block('parent-a', 'parent typed', { document_id: 'parent-doc' });
    useNoteBlockStore.getState().setActiveDocumentId('parent-doc');
    useNoteBlockStore.getState().hydrate([parentBlock]);
    useNoteBlockStore.getState().patchContent('parent-a', { text: 'parent typed' });

    const childBlocks = [block('child-a', 'child loaded', { document_id: 'child-doc' })];
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().hydrate(childBlocks);

    const merged = mergeBlocksWithStoreContent(childBlocks);
    expect(merged[0].content?.text).toBe('child loaded');
  });

  it('reconcile in child doc ignores parent store entries', () => {
    useNoteBlockStore.getState().setActiveDocumentId('parent-doc');
    useNoteBlockStore.getState().hydrate([
      block('shared-id', 'parent text', { document_id: 'parent-doc' }),
    ]);

    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    const current = [block('child-a', 'typing', { document_id: 'child-doc' })];
    useNoteBlockStore.getState().hydrate(current);
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'child-a', field: 'text' });
    useNoteBlockStore.getState().patchContent('child-a', { text: 'typing' });

    const reconciled = [block('child-a', 'server', { document_id: 'child-doc' })];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged[0].content?.text).toBe('typing');
  });

  it('load normalizes list marker text for child document blocks', () => {
    const loaded = normalizeLoadedNoteBlocks([
      block('child-list', '-', { document_id: 'child-doc', type: 'bulletList' }),
    ]);
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().hydrate(loaded);
    const merged = mergeBlocksWithStoreContent(loaded);
    expect(merged[0].content?.text).toBe('');
  });
});

describe('sub-document navigation (parent ↔ child)', () => {
  it('parent typing survives commit+reset then child load simulation', async () => {
    const parentBlocks = [block('p1', 'before leave', { document_id: 'parent-doc' })];
    useNoteBlockStore.getState().setActiveDocumentId('parent-doc');
    useNoteBlockStore.getState().hydrate(parentBlocks);
    useNoteBlockStore.getState().patchContent('p1', { text: 'before leave' });

    const { commitAndResetNoteDocumentBeforeSwitch } = await import('./noteBlockStateMerge');
    await commitAndResetNoteDocumentBeforeSwitch();

    expect(useNoteBlockStore.getState().activeEditor).toBeNull();
    expect(useNoteBlockStore.getState().getBlocksArray()).toHaveLength(1);

    const childBlocks = [block('c1', 'child body', { document_id: 'child-doc' })];
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().hydrate(childBlocks);

    const merged = mergeBlocksWithStoreContent(childBlocks);
    expect(merged[0].content?.text).toBe('child body');
    expect(merged.find((b) => b.id === 'p1')).toBeUndefined();
  });
});

describe('getBlockedTypeChangeReason', () => {
  it('blocks page → toggle when linked sub-document exists', () => {
    const reason = getBlockedTypeChangeReason('page', 'toggle', {
      page_document_id: 'doc-123',
      title: '스케줄',
    });
    expect(reason).toMatch(/하위 문서/);
  });

  it('blocks any type → page via turn into', () => {
    expect(getBlockedTypeChangeReason('text', 'page', { text: 'hi' })).toMatch(/하위 문서/);
  });

  it('allows text → toggle', () => {
    expect(getBlockedTypeChangeReason('text', 'toggle', { text: 'hi' })).toBeNull();
  });

  it('filters page from turn-into commands', () => {
    const filtered = filterTurnIntoCommands('page', [
      { type: 'text', label: '텍스트' },
      { type: 'toggle', label: '토글' },
    ], { page_document_id: 'x', title: 'A' });
    expect(filtered).toHaveLength(0);
  });
});

describe('buildContentForTypeChange markdown to list', () => {
  it('strips - and * when converting text to bulletList', () => {
    const fromDash = buildContentForTypeChange({ text: '-' }, 'text', 'bulletList');
    expect(fromDash.text).toBe('');
    const fromStar = buildContentForTypeChange({ text: '*' }, 'text', 'bulletList');
    expect(fromStar.text).toBe('');
    const fromDashSpace = buildContentForTypeChange({ text: '- ' }, 'text', 'bulletList');
    expect(fromDashSpace.text).toBe('');
    const fromStarSpace = buildContentForTypeChange({ text: '* ' }, 'text', 'bulletList');
    expect(fromStarSpace.text).toBe('');
  });

  it('strips 1. when converting text to numberedList', () => {
    const next = buildContentForTypeChange({ text: '1.' }, 'text', 'numberedList');
    expect(next.text).toBe('');
    const nextWithSpace = buildContentForTypeChange({ text: '1. ' }, 'text', 'numberedList');
    expect(nextWithSpace.text).toBe('');
  });
});

describe('visual navigate after 3-level Tab nest', () => {
  it('↑↓ follows DOM order a → b → c → after', () => {
    const blocks = [
      block('a', 'A', { type: 'bulletList', order_index: 0 }),
      block('b', 'B', { type: 'bulletList', order_index: 0, parent_block_id: 'a' }),
      block('c', 'C', { type: 'bulletList', order_index: 0, parent_block_id: 'b' }),
      block('after', 'X', { order_index: 1 }),
    ];

    expect(resolveVisualNavigateTarget(blocks, 'c', 'previous')?.id).toBe('b');
    expect(resolveVisualNavigateTarget(blocks, 'b', 'previous')?.id).toBe('a');
    expect(resolveVisualNavigateTarget(blocks, 'c', 'next')?.id).toBe('after');
  });
});
