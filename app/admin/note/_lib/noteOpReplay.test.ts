import { describe, expect, it } from 'vitest';
import { applyRemoteOpRecords, mergeSnapshotPatches } from './noteOpReplay';
import type { NoteBlock } from './types';
import type { NoteBlockOpRecord, NoteBlockSnapshot } from '@/app/lib/note/noteBlockOpTypes';

const baseBlock = (id: string, text: string, overrides: Partial<NoteBlock> = {}): NoteBlock => ({
  id,
  document_id: 'doc-1',
  parent_block_id: null,
  type: 'text',
  order_index: 0,
  content: { text },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  version: 1,
  ...overrides,
});

const opRecord = (
  seq: number,
  payload: NoteBlockOpRecord['payload'],
): NoteBlockOpRecord => ({
  seq,
  clientOpId: `op-${seq}`,
  opType: payload.opType,
  payload,
  actorId: 'user-1',
  createdAt: '2026-01-02T00:00:00.000Z',
});

describe('applyRemoteOpRecords', () => {
  it('applies patch_content to matching block', () => {
    const blocks = [baseBlock('a', 'hello')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'patch_content',
        blockId: 'a',
        content: { text: 'world' },
      }),
    ]);
    expect((next[0].content as { text?: string }).text).toBe('world');
  });

  it('soft deletes blocks by removing them from the active set', () => {
    const blocks = [baseBlock('a', 'hello'), baseBlock('b', 'keep')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, { opType: 'soft_delete', ids: ['a'] }),
    ]);
    expect(next.map((block) => block.id)).toEqual(['b']);
  });

  it('creates a new block', () => {
    const blocks = [baseBlock('a', 'hello')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'create_block',
        id: 'b',
        documentId: 'doc-1',
        blockType: 'text',
        content: { text: 'new' },
        order_index: 1,
        parent_block_id: null,
      }),
    ]);
    expect(next).toHaveLength(2);
    expect(next.find((block) => block.id === 'b')?.content).toEqual({ text: 'new' });
  });

  it('applies patch_fields structure including explicit root parent', () => {
    const blocks = [
      baseBlock('toggle', 'section', { type: 'toggle', order_index: 0 }),
      baseBlock('child', 'child', { parent_block_id: 'toggle', order_index: 0 }),
      baseBlock('sibling', 'sibling', { order_index: 1 }),
    ];

    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'patch_fields',
        patches: [
          { id: 'child', parent_block_id: null, order_index: 2 },
          { id: 'sibling', parent_block_id: 'toggle', order_index: 0 },
        ],
      }),
    ]);

    expect(next.find((block) => block.id === 'child')).toMatchObject({
      parent_block_id: null,
      order_index: 2,
    });
    expect(next.find((block) => block.id === 'sibling')).toMatchObject({
      parent_block_id: 'toggle',
      order_index: 0,
    });
  });

  it('applies block_transaction as patches, deletes, then creates', () => {
    const blocks = [
      baseBlock('root', 'root', { order_index: 0 }),
      baseBlock('moving', 'moving', { order_index: 1 }),
      baseBlock('deleted', 'deleted', { order_index: 2 }),
    ];

    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'block_transaction',
        patches: [
          { id: 'moving', document_id: 'target-doc', parent_block_id: null, order_index: 0 },
        ],
        deleteIds: ['deleted'],
        creates: [{
          id: 'created',
          document_id: 'doc-1',
          parent_block_id: 'root',
          type: 'todo',
          order_index: 0,
          content: { text: 'created', checked: false },
        }],
      }),
    ]);

    expect(next.map((block) => block.id).sort()).toEqual(['created', 'moving', 'root']);
    expect(next.find((block) => block.id === 'moving')).toMatchObject({
      document_id: 'target-doc',
      parent_block_id: null,
      order_index: 0,
    });
    expect(next.find((block) => block.id === 'created')).toMatchObject({
      document_id: 'doc-1',
      parent_block_id: 'root',
      type: 'todo',
      content: { text: 'created', checked: false },
    });
  });
});

describe('mergeSnapshotPatches', () => {
  it('drops active blocks when merge snapshot reports deleted_at', () => {
    const blocks = [baseBlock('a', 'hello'), baseBlock('b', 'keep')];
    const snapshots: NoteBlockSnapshot[] = [{
      id: 'a',
      document_id: 'doc-1',
      parent_block_id: null,
      type: 'text',
      order_index: 0,
      content: { text: 'hello' },
      version: 2,
      updated_at: '2026-01-03T00:00:00.000Z',
      deleted_at: '2026-01-03T00:00:00.000Z',
    }];
    const next = mergeSnapshotPatches(blocks, snapshots);
    expect(next.map((block) => block.id)).toEqual(['b']);
  });

  it('preserves local content when snapshot has server content', () => {
    const blocks = [baseBlock('a', 'local typing')];
    const snapshots: NoteBlockSnapshot[] = [{
      id: 'a',
      document_id: 'doc-1',
      parent_block_id: null,
      type: 'text',
      order_index: 0,
      content: { text: 'server' },
      version: 2,
      updated_at: '2026-01-03T00:00:00.000Z',
    }];
    const next = mergeSnapshotPatches(blocks, snapshots);
    expect((next[0].content as { text?: string }).text).toBe('local typing');
    expect(next[0].version).toBe(2);
  });

  it('does not resurrect blocks excluded as pending soft deletes', () => {
    const blocks = [baseBlock('a', 'keep')];
    const snapshots: NoteBlockSnapshot[] = [{
      id: 'b',
      document_id: 'doc-1',
      parent_block_id: null,
      type: 'text',
      order_index: 1,
      content: { text: 'zombie' },
      version: 1,
      updated_at: '2026-01-03T00:00:00.000Z',
    }];
    const next = mergeSnapshotPatches(blocks, snapshots, {
      excludeBlockIds: new Set(['b']),
    });
    expect(next.map((block) => block.id)).toEqual(['a']);
  });
});
