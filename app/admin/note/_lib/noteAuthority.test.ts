import { describe, expect, it } from 'vitest';
import {
  decideEmptySnapshotApply,
  decideRegressiveContentOp,
  decideStructureReconcile,
  readAuthorityBlockText,
  shouldKeepLocalOverEmptyServerAuthority,
} from './noteAuthority';
import type { NoteBlock } from './types';

describe('decideEmptySnapshotApply', () => {
  it('merges when incoming is non-empty', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'x' } }],
      incomingBlocks: [{ id: 'b' }],
    })).toBe('merge_non_empty');
  });

  it('rejects unconfirmed empty when local has protectable body', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'keep' } }],
      incomingBlocks: [],
    })).toBe('reject_race_wipe');
  });

  it('rejects unconfirmed empty when local has image presence', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'image', content: { url: 'https://x/y.png' } }],
      incomingBlocks: [],
    })).toBe('reject_race_wipe');
  });

  it('accepts emptyConfirmed', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'gone' } }],
      incomingBlocks: [],
      emptyConfirmed: true,
    })).toBe('accept_empty');
  });

  it('accepts when pending leave explains every local id', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [
        { id: 'a', type: 'text', content: { text: 'x' } },
        { id: 'b', type: 'text', content: { text: 'y' } },
      ],
      incomingBlocks: [],
      pendingLeaveIds: new Set(['a', 'b']),
    })).toBe('accept_empty');
  });

  it('accepts empty stubs without protectable presence', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: '', html: '<p></p>' } }],
      incomingBlocks: [],
    })).toBe('accept_empty');
  });
});

describe('decideRegressiveContentOp', () => {
  it('pushes clear intent when local text is already empty', () => {
    expect(decideRegressiveContentOp({ localText: '', patchText: '' })).toBe('push');
  });

  it('drops stale empty patch when local still has text', () => {
    expect(decideRegressiveContentOp({ localText: 'alive', patchText: '' })).toBe('drop_stale');
  });

  it('treats title as protectable body text for regressive checks', () => {
    expect(readAuthorityBlockText({ title: 'Section' })).toBe('Section');
    expect(decideRegressiveContentOp({
      localText: readAuthorityBlockText({ title: 'Section' }),
      patchText: '',
    })).toBe('drop_stale');
  });

  it('pushes non-empty patches', () => {
    expect(decideRegressiveContentOp({ localText: 'a', patchText: 'b' })).toBe('push');
  });

  it('drops stale prefix patches that would truncate local text', () => {
    expect(decideRegressiveContentOp({
      localText: '7.20 월요일 12시 송예원T OT',
      patchText: '7',
    })).toBe('drop_stale');
  });

  it('drops stale empty patch when local still has image url', () => {
    expect(decideRegressiveContentOp({
      localText: '',
      patchText: '',
      localHasMediaPresence: true,
      patchHasMediaPresence: false,
    })).toBe('drop_stale');
  });

  it('pushes image clear intent when local media presence already gone', () => {
    expect(decideRegressiveContentOp({
      localText: '',
      patchText: '',
      localHasMediaPresence: false,
      patchHasMediaPresence: false,
    })).toBe('push');
  });
});

describe('shouldKeepLocalOverEmptyServerAuthority', () => {
  it('keeps local body over empty server without leave', () => {
    expect(shouldKeepLocalOverEmptyServerAuthority({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'typed' } }],
      serverBlocks: [],
    })).toBe(true);
  });

  it('does not keep local when leave covers ids', () => {
    expect(shouldKeepLocalOverEmptyServerAuthority({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'typed' } }],
      serverBlocks: [],
      pendingLeaveIds: new Set(['a']),
    })).toBe(false);
  });
});

function topoBlock(
  id: string,
  order_index: number,
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'todo',
    order_index,
    content: { text: id, checked: false },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };
}

describe('decideStructureReconcile', () => {
  it('accepts incoming when no unpublished topology', () => {
    expect(decideStructureReconcile({
      localBlocks: [topoBlock('a', 0), topoBlock('b', 1)],
      incomingBlocks: [topoBlock('b', 0), topoBlock('a', 1)],
      hasUnpublishedTopology: false,
    })).toBe('accept_incoming');
  });

  it('preserves local when unpublished topology would regress reorder', () => {
    expect(decideStructureReconcile({
      localBlocks: [topoBlock('a', 0), topoBlock('b', 1), topoBlock('c', 2)],
      incomingBlocks: [topoBlock('c', 0), topoBlock('a', 1), topoBlock('b', 2)],
      hasUnpublishedTopology: true,
    })).toBe('preserve_local');
  });

  it('accepts incoming when structures already match despite unpublished topology', () => {
    const blocks = [topoBlock('a', 0), topoBlock('b', 1)];
    expect(decideStructureReconcile({
      localBlocks: blocks,
      incomingBlocks: blocks,
      hasUnpublishedTopology: true,
    })).toBe('accept_incoming');
  });
});
