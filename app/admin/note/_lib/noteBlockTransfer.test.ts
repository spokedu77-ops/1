import { describe, expect, it } from 'vitest';
import { buildBlockTransferPatches } from './noteBlockTransfer';

describe('buildBlockTransferPatches', () => {
  it('sets document_id for all blocks and clears root parent', () => {
    expect(buildBlockTransferPatches('root', ['root', 'child-1'], 'doc-target')).toEqual([
      { id: 'root', document_id: 'doc-target', parent_block_id: null },
      { id: 'child-1', document_id: 'doc-target' },
    ]);
  });

  it('returns empty for empty id list', () => {
    expect(buildBlockTransferPatches('root', [], 'doc-target')).toEqual([]);
  });
});
