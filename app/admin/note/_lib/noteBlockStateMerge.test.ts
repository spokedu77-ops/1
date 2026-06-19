import { describe, expect, it, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  applyRestoreBlockSnapshots,
  mergeBlocksWithStoreContent,
  mergeReconciledBlocks,
} from './noteBlockStateMerge';
import type { NoteBlock } from './types';

const block = (id: string, text: string): NoteBlock => ({
  id,
  document_id: 'doc',
  type: 'text',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
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

describe('mergeReconciledBlocks', () => {
  it('preserves store text when server reconcile differs', () => {
    const current = [block('a', 'old')];
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate(current);
    useNoteBlockStore.getState().patchContent('a', { text: 'typing' });
    const reconciled = [block('a', 'server')];
    const merged = mergeReconciledBlocks(current, reconciled);
    expect(merged[0].content?.text).toBe('typing');
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
});
