import { describe, expect, it } from 'vitest';
import {
  mergeMemoPadTransactionPatchFromSanitize,
  pickMemoPadServerStructuralPatch,
  violatesMemoPadSilentServerMutation,
} from './noteMemoPadContract';

describe('Memo Pad Contract', () => {
  it('server structural patch allows parent/type only', () => {
    expect(pickMemoPadServerStructuralPatch({
      parent_block_id: null,
      type: 'todo',
      order_index: 2,
      content: { text: 'x' },
    })).toEqual({ parent_block_id: null, type: 'todo' });
  });

  it('flags silent order_index persist as violation', () => {
    expect(violatesMemoPadSilentServerMutation({ order_index: 1 })).toBe(true);
    expect(violatesMemoPadSilentServerMutation({ parent_block_id: null })).toBe(false);
  });

  it('transaction merge preserves client order_index', () => {
    const merged = mergeMemoPadTransactionPatchFromSanitize(
      { id: 'a', order_index: 7, parent_block_id: 'p' },
      { parent_block_id: null, type: 'todo', document_id: 'doc-1' },
    );
    expect(merged.order_index).toBe(7);
    expect(merged.parent_block_id).toBeNull();
    expect(merged.type).toBe('todo');
    expect(merged.document_id).toBe('doc-1');
  });
});
