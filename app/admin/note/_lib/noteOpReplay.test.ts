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

  it('soft deletes blocks by id', () => {
    const blocks = [baseBlock('a', 'hello'), baseBlock('b', 'keep')];
    const next = applyRemoteOpRecords(blocks, [
      opRecord(1, { opType: 'soft_delete', ids: ['a'] }),
    ]);
    expect(next.find((block) => block.id === 'a')?.deleted_at).toBeTruthy();
    expect(next.find((block) => block.id === 'b')?.deleted_at).toBeFalsy();
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
});

describe('mergeSnapshotPatches', () => {
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
