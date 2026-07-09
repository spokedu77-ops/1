import { describe, expect, it } from 'vitest';
import { applyNoteCommand } from './noteCommandReducer';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: '', html: '<p></p>' },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
    version: 1,
    ...overrides,
  };
}

const ctx = {
  documentId: 'doc-1',
  activeBlockId: null,
  storeContentById: {},
};

describe('applyNoteCommand', () => {
  it('hydrate replaces document blocks', () => {
    const previous = [block('old')];
    const incoming = [block('new')];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'hydrate', blocks: incoming },
      ctx,
    );
    expect(structural).toBe(true);
    expect(blocks.map((b) => b.id)).toEqual(['new']);
  });

  it('syncSnapshot keeps local-only blocks within grace period', () => {
    const recent = block('local-only', {
      created_at: new Date().toISOString(),
    });
    const previous = [recent];
    const incoming = [block('server')];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: incoming },
      ctx,
    );
    expect(blocks.map((b) => b.id).sort()).toEqual(['local-only', 'server']);
  });

  it('patchContent updates a single block', () => {
    const previous = [block('a', { content: { text: 'old' } })];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'patchContent', blockId: 'a', content: { text: 'new' } },
      ctx,
    );
    expect(structural).toBe(false);
    expect((blocks[0].content as { text: string }).text).toBe('new');
  });

  it('preserves store content for active editor on syncSnapshot', () => {
    const previous = [block('a', { content: { text: 'server' } })];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [block('a', { content: { text: 'stale' } })] },
      {
        documentId: 'doc-1',
        activeBlockId: 'a',
        storeContentById: { a: { text: 'typing' } },
      },
    );
    expect((blocks[0].content as { text: string }).text).toBe('typing');
  });
});
