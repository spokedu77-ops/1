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
  it('applies patch_content extension to matching block', () => {
    const blocks = [baseBlock('a', 'hello')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'patch_content',
        blockId: 'a',
        content: { text: 'hello world' },
      }),
    ]);
    expect((next[0].content as { text?: string }).text).toBe('hello world');
  });

  it('applies remote patch_content rewrite — ACK Intent materialize (cross-PC)', () => {
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

  it('applies remote empty patch_content when other PC cleared — ACK Intent', () => {
    const blocks = [baseBlock('a', 'keep local')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'patch_content',
        blockId: 'a',
        content: { text: '' },
      }),
    ]);
    expect((next[0].content as { text?: string }).text).toBe('');
  });

  it('applies remote todo check — same login must match across PCs', () => {
    const blocks = [baseBlock('t', '할 일', {
      type: 'todo',
      content: { text: '할 일', checked: false },
    })];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'patch_content',
        blockId: 't',
        content: { text: '할 일', checked: true },
      }),
    ]);
    expect((next[0].content as { checked?: boolean }).checked).toBe(true);
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

  it('ignores legacy normalizeOrders on create_block replay', () => {
    const blocks = [
      baseBlock('a', 'first', { order_index: 0 }),
      baseBlock('b', 'second', { order_index: 1 }),
    ];

    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, {
        opType: 'create_block',
        id: 'c',
        documentId: 'doc-1',
        blockType: 'todo',
        content: { text: 'created', checked: false },
        order_index: 2,
        parent_block_id: null,
        normalizeOrders: [
          { id: 'a', order_index: 99 },
          { id: 'b', order_index: 100 },
        ],
      }),
    ]);

    expect(next.find((block) => block.id === 'a')?.order_index).toBe(0);
    expect(next.find((block) => block.id === 'b')?.order_index).toBe(1);
    expect(next.find((block) => block.id === 'c')).toMatchObject({
      order_index: 2,
      type: 'todo',
    });
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

  it('ACK snapshot materializes server content (cross-PC SSOT)', () => {
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
    expect((next[0].content as { text?: string }).text).toBe('server');
    expect(next[0].version).toBe(2);
  });

  it('restores server content over an empty local placeholder', () => {
    const blocks = [baseBlock('a', '', {
      type: 'callout',
      content: { icon: 'i', text: '', html: '<p></p>' },
    })];
    const snapshots: NoteBlockSnapshot[] = [{
      id: 'a',
      document_id: 'doc-1',
      parent_block_id: null,
      type: 'callout',
      order_index: 0,
      content: {
        icon: 'i',
        text: 'server callout line 1\nserver callout line 2',
        html: '<p>server callout line 1<br>server callout line 2</p>',
      },
      version: 2,
      updated_at: '2026-01-03T00:00:00.000Z',
    }];
    const next = mergeSnapshotPatches(blocks, snapshots);
    expect((next[0].content as { text?: string }).text).toBe('server callout line 1\nserver callout line 2');
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

  it('ZERO LOSS: content ACK snapshot must not rewrite sibling order_index', () => {
    const blocks = [
      baseBlock('todo-c', 'C', { type: 'todo', order_index: 0, content: { text: 'C', checked: false } }),
      baseBlock('todo-a', 'A', { type: 'todo', order_index: 1, content: { text: 'A local', checked: false } }),
      baseBlock('todo-b', 'B', { type: 'todo', order_index: 2, content: { text: 'B', checked: false } }),
    ];
    // 서버는 예전 순서 A,B,C — content push ACK만 왔는데 order까지 덮으면 체크리스트가 춤춤
    const snapshots: NoteBlockSnapshot[] = [{
      id: 'todo-a',
      document_id: 'doc-1',
      parent_block_id: null,
      type: 'todo',
      order_index: 0,
      content: { text: 'A server', checked: false },
      version: 3,
      updated_at: '2026-08-09T00:00:00.000Z',
    }];
    const next = mergeSnapshotPatches(blocks, snapshots);
    expect(next.map((block) => block.id)).toEqual(['todo-c', 'todo-a', 'todo-b']);
    expect(next.map((block) => block.order_index)).toEqual([0, 1, 2]);
    expect((next.find((block) => block.id === 'todo-a')?.content as { text?: string }).text)
      .toBe('A server');
    expect(next.find((block) => block.id === 'todo-a')?.version).toBe(3);
  });
});
