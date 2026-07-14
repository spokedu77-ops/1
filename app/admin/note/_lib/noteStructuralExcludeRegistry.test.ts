import { describe, expect, it } from 'vitest';
import type { NoteLocalOutboundOp } from './noteLocalDb';
import {
  addStructuralExcludeIds,
  clearStructuralExcludeForDocument,
  getStructuralExcludeIds,
  removeStructuralExcludeIds,
  syncStructuralExcludeFromOutbound,
} from './noteStructuralExcludeRegistry';

function softDeleteOp(blockId: string): NoteLocalOutboundOp {
  return {
    documentId: 'doc-1',
    clientOpId: `op-${blockId}`,
    createdAt: Date.now(),
    opType: 'soft_delete',
    payload: { opType: 'soft_delete', blockId },
  };
}

function transferAwayOp(blockId: string): NoteLocalOutboundOp {
  return {
    documentId: 'doc-source',
    clientOpId: `op-${blockId}`,
    createdAt: Date.now(),
    opType: 'block_transaction',
    payload: {
      opType: 'block_transaction',
      patches: [{ id: blockId, document_id: 'doc-target' }],
      deleteIds: [],
    },
  };
}

describe('noteStructuralExcludeRegistry', () => {
  it('keeps exclude ids until outbound op is consumed (no TTL)', () => {
    clearStructuralExcludeForDocument('doc-1');
    addStructuralExcludeIds('doc-1', ['todo-1']);
    syncStructuralExcludeFromOutbound('doc-1', [softDeleteOp('todo-1')]);
    expect([...getStructuralExcludeIds('doc-1')]).toEqual(['todo-1']);

    syncStructuralExcludeFromOutbound('doc-1', []);
    expect(getStructuralExcludeIds('doc-1').size).toBe(0);
  });

  it('covers optimistic exclude before outbound append', () => {
    clearStructuralExcludeForDocument('doc-source');
    addStructuralExcludeIds('doc-source', ['todo-1']);
    expect([...getStructuralExcludeIds('doc-source')]).toEqual(['todo-1']);

    syncStructuralExcludeFromOutbound('doc-source', [transferAwayOp('todo-1')]);
    expect([...getStructuralExcludeIds('doc-source')]).toEqual(['todo-1']);
  });

  it('rolls back exclude on explicit remove', () => {
    clearStructuralExcludeForDocument('doc-1');
    addStructuralExcludeIds('doc-1', ['a', 'b']);
    removeStructuralExcludeIds('doc-1', ['a']);
    expect([...getStructuralExcludeIds('doc-1')]).toEqual(['b']);
  });
});
