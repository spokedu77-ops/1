import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { registerNoteEditor, unregisterNoteEditor } from '../_components/noteEditorRegistry';
import { setActiveEditorBridge, clearActiveEditorBridge } from './noteActiveEditorBridge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  applyRestoreBlockSnapshots,
  commitNoteDocumentBeforeLeave,
  LOCAL_ONLY_BLOCK_GRACE_MS,
  mergeBlocksWithStoreContent,
  mergeReconciledBlocks,
  registerNoteContentFlush,
  serverSnapshotRecoversMissingBlocks,
  unionReconciledWithLocalBlocks,
  wouldReconcileRegressActiveText,
} from './noteBlockStateMerge';
import { markPendingBlockDeletes } from './noteReconcileIdle';
import type { NoteBlock } from './types';

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

describe('mergeBlocksWithStoreContent', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().hydrate([]);
  });

  it('prefers store content over stale React blocks', () => {
    const stale = [block('a', 'old')];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate(stale);
    useNoteBlockStore.getState().patchContent('a', { text: 'typed in store' });

    const merged = mergeBlocksWithStoreContent(stale);

    expect(merged[0].content?.text).toBe('typed in store');
  });

  it('keeps React block when store has no entry', () => {
    const react = [block('b', 'from react')];
    const merged = mergeBlocksWithStoreContent(react);
    expect(merged[0].content?.text).toBe('from react');
  });

  it('keeps React title while applying store text', () => {
    const react: NoteBlock[] = [{
      id: 't',
      document_id: 'doc',
      type: 'toggle',
      content: { title: '제목', body: 'stale' },
      order_index: 0,
      parent_block_id: null,
      created_at: '',
      updated_at: '',
    }];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate(react);
    useNoteBlockStore.getState().patchContent('t', { title: '', body: 'typed' });

    const merged = mergeBlocksWithStoreContent(react);
    expect(merged[0].content?.title).toBe('제목');
    expect(merged[0].content?.body).toBe('typed');
  });
});

describe('applyRestoreBlockSnapshots', () => {
  it('restores snapshot fields and keeps unknown blocks', () => {
    const current = [block('a', 'old'), block('b', 'keep')];
    const snapshots = [{
      ...block('a', 'restored'),
      type: 'bulletList',
      parent_block_id: 'parent',
      order_index: 2,
    }];
    const next = applyRestoreBlockSnapshots(current, snapshots);
    expect(next.find((b) => b.id === 'a')?.content?.text).toBe('restored');
    expect(next.find((b) => b.id === 'a')?.type).toBe('bulletList');
    expect(next.find((b) => b.id === 'b')?.content?.text).toBe('keep');
  });
});

describe('commitNoteDocumentBeforeLeave', () => {
  beforeEach(() => {
    registerNoteContentFlush(null);
    unregisterNoteEditor('active');
    clearActiveEditorBridge('active', 'text');
  });

  it('commits the active editor content before flushing persist queues', async () => {
    const order: string[] = [];
    const onChange = vi.fn(() => order.push('editor'));
    const flush = vi.fn(async () => {
      order.push('flush');
    });
    registerNoteEditor('active', {
      isDestroyed: false,
      getText: () => 'last typed text',
      getHTML: () => '<p>last typed text</p>',
    } as unknown as Editor);
    setActiveEditorBridge({
      blockId: 'active',
      field: 'text',
      slotElement: {} as HTMLElement,
      getProps: () => ({
        text: '',
        content: {},
        onChange,
      } as never),
    });
    registerNoteContentFlush(flush);

    await commitNoteDocumentBeforeLeave();

    expect(onChange).toHaveBeenCalledWith({
      text: 'last typed text',
      html: '<p>last typed text</p>',
    });
    expect(flush).toHaveBeenCalledOnce();
    expect(order).toEqual(['editor', 'flush']);
  });
});

describe('mergeReconciledBlocks', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().setActiveEditor(null);
    useNoteBlockStore.getState().hydrate([]);
  });

  it('preserves store text for active editor when server reconcile differs', () => {
    const current = [block('a', 'old')];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    useNoteBlockStore.getState().hydrate(current);
    useNoteBlockStore.getState().patchContent('a', { text: 'typing' });
    const reconciled = [block('a', 'server')];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged[0].content?.text).toBe('typing');
  });

  it('uses server text for non-active blocks even when store differs', () => {
    const current = [block('a', 'old')];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate(current);
    useNoteBlockStore.getState().patchContent('a', { text: 'stale store' });
    const reconciled = [block('a', 'from server')];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged[0].content?.text).toBe('from server');
  });

  it('strips list markers from server-only reconcile rows', () => {
    const current: NoteBlock[] = [{
      id: 'list-a',
      document_id: 'doc',
      type: 'bulletList',
      content: { text: '- item' },
      order_index: 0,
      parent_block_id: null,
      created_at: '',
      updated_at: '',
    }];
    const reconciled: NoteBlock[] = [{
      ...current[0],
      content: { text: '- from server' },
    }];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged[0].content?.text).toBe('from server');
  });

  it('does not resurrect deleted toggle children from legacyBody during reconcile', () => {
    const current: NoteBlock[] = [{
      id: 't1',
      document_id: 'doc',
      type: 'toggle',
      content: { title: 'Section', bodyMigrated: true },
      order_index: 0,
      parent_block_id: null,
      created_at: '',
      updated_at: '',
    }];
    const reconciled: NoteBlock[] = [{
      ...current[0],
      content: {
        title: 'Section',
        body: '',
        legacyBody: 'zombie archive',
        bodyMigrated: true,
      },
    }];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged.filter((block) => block.parent_block_id === 't1')).toHaveLength(0);
    expect(merged.find((block) => block.id === 't1')?.content?.legacyBody).toBe('zombie archive');
  });
});

describe('unionReconciledWithLocalBlocks', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().hydrate([]);
  });

  it('keeps local-only blocks not yet on server when recently created', () => {
    const current = [
      block('local-new', 'draft', {
        document_id: 'child-doc',
        type: 'todo',
        created_at: new Date().toISOString(),
      }),
    ];
    const merged = unionReconciledWithLocalBlocks(current, [], 'child-doc');
    expect(merged.some((b) => b.id === 'local-new')).toBe(true);
  });

  it('drops local-only blocks older than grace window', () => {
    const staleCreatedAt = new Date(Date.now() - LOCAL_ONLY_BLOCK_GRACE_MS - 1000).toISOString();
    const current = [
      block('stale-local', 'ghost', {
        document_id: 'child-doc',
        type: 'todo',
        created_at: staleCreatedAt,
      }),
    ];
    const merged = unionReconciledWithLocalBlocks(current, [], 'child-doc');
    expect(merged.some((b) => b.id === 'stale-local')).toBe(false);
  });
});

describe('wouldReconcileRegressActiveText', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().hydrate([]);
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
  });

  it('detects when reconcile would shorten active block text', () => {
    useNoteBlockStore.getState().hydrate([
      block('a', 'hello world', { document_id: 'child-doc', type: 'todo' }),
    ]);
    useNoteBlockStore.getState().patchContent('a', { text: 'hello world!' });
    const merged = [block('a', 'hello', { document_id: 'child-doc', type: 'todo' })];
    expect(wouldReconcileRegressActiveText(merged)).toBe(true);
  });
});

describe('serverSnapshotRecoversMissingBlocks', () => {
  it('detects when server has substantially more blocks than local UI', () => {
    const local = [block('a', 'one', { document_id: 'doc-1' })];
    const server = [
      block('a', 'one', { document_id: 'doc-1' }),
      block('b', 'two', { document_id: 'doc-1', order_index: 1 }),
      block('c', 'three', { document_id: 'doc-1', order_index: 2 }),
    ];
    expect(serverSnapshotRecoversMissingBlocks(local, server, 'doc-1')).toBe(true);
  });

  it('does not recover when recent block deletes are pending (legacy HTTP)', () => {
    const local = [block('a', 'one', { document_id: 'doc-1' })];
    const server = [
      block('a', 'one', { document_id: 'doc-1' }),
      block('b', 'deleted', { document_id: 'doc-1', order_index: 1 }),
      block('c', 'deleted2', { document_id: 'doc-1', order_index: 2 }),
    ];
    markPendingBlockDeletes('doc-1', ['b', 'c']);
    expect(serverSnapshotRecoversMissingBlocks(local, server, 'doc-1')).toBe(false);
  });
});
