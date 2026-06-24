import { describe, expect, it } from 'vitest';
import {
  applyNoteDocumentOp,
  applyServerBlockVersions,
  createNoteDocumentEngineState,
  getEngineBlock,
} from './noteDocumentEngine';
import type { NoteBlock } from './types';

const block = (
  id: string,
  text: string,
  opts: Partial<NoteBlock> = {},
): NoteBlock => ({
  id,
  document_id: 'doc-1',
  type: 'text',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  version: 1,
  ...opts,
});

describe('noteDocumentEngine', () => {
  it('replaceBlocks sets document blocks', () => {
    const state = createNoteDocumentEngineState('doc-1', [block('a', 'one')]);
    const next = applyNoteDocumentOp(state, {
      type: 'replaceBlocks',
      blocks: [block('b', 'two')],
    });
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0].id).toBe('b');
  });

  it('updateContent patches a single block', () => {
    const state = createNoteDocumentEngineState('doc-1', [
      block('a', 'before'),
      block('b', 'other'),
    ]);
    const next = applyNoteDocumentOp(state, {
      type: 'updateContent',
      blockId: 'a',
      content: { text: 'after' },
    });
    expect(getEngineBlock(next, 'a')?.content?.text).toBe('after');
    expect(getEngineBlock(next, 'b')?.content?.text).toBe('other');
  });

  it('applyPatches updates structure fields', () => {
    const state = createNoteDocumentEngineState('doc-1', [
      block('a', 'line', { order_index: 0, parent_block_id: null }),
    ]);
    const next = applyNoteDocumentOp(state, {
      type: 'applyPatches',
      patches: [{ id: 'a', parent_block_id: 'parent-1', order_index: 2 }],
    });
    const updated = getEngineBlock(next, 'a');
    expect(updated?.parent_block_id).toBe('parent-1');
    expect(updated?.order_index).toBe(2);
  });

  it('syncFromServer updates inactive block content and version', () => {
    const state = createNoteDocumentEngineState('doc-1', [
      block('a', 'local', { version: 2 }),
      block('b', 'other', { version: 1 }),
    ]);
    const next = applyNoteDocumentOp(state, {
      type: 'syncFromServer',
      blocks: [
        block('a', 'server-a', { version: 5 }),
        block('b', 'server-b', { version: 3 }),
      ],
    }, { activeBlockId: 'a' });

    expect(getEngineBlock(next, 'a')?.content?.text).toBe('local');
    expect(getEngineBlock(next, 'a')?.version).toBe(5);
    expect(getEngineBlock(next, 'b')?.content?.text).toBe('server-b');
    expect(getEngineBlock(next, 'b')?.version).toBe(3);
  });

  it('applyServerBlockVersions bumps version only', () => {
    const blocks = [block('a', 'text', { version: 2 })];
    const next = applyServerBlockVersions(blocks, [{
      id: 'a',
      version: 4,
      updated_at: '2026-02-01T00:00:00Z',
    }]);
    expect(next[0].version).toBe(4);
    expect(next[0].content?.text).toBe('text');
  });

  it('ignores blocks from other documents on replace', () => {
    const state = createNoteDocumentEngineState('doc-1', []);
    const next = applyNoteDocumentOp(state, {
      type: 'replaceBlocks',
      blocks: [
        block('a', 'mine'),
        block('b', 'other', { document_id: 'doc-2' }),
      ],
    });
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0].id).toBe('a');
  });
});
