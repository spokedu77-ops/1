import { describe, expect, it } from 'vitest';
import { resolveInstantDisplayBlocks } from './noteDisplayBlocks';
import type { NoteBlock } from './types';

function block(id: string, documentId: string): NoteBlock {
  return {
    id,
    document_id: documentId,
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: id },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
  };
}

describe('resolveInstantDisplayBlocks', () => {
  it('prefers live React blocks for the active document', () => {
    const blocks = [block('a', 'doc-a'), block('b', 'doc-b')];
    const result = resolveInstantDisplayBlocks('doc-a', blocks);
    expect(result.map((row) => row.id)).toEqual(['a']);
  });
});
