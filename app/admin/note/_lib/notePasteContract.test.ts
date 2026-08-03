import { describe, expect, it } from 'vitest';
import {
  resolveCrossSelectClipboardPlain,
  resolvePasteInsertMode,
  resolveStructuredBlocksClipboardPlain,
  shouldApplyStructuralPasteSpecs,
} from './notePasteContract';
import { parseBlockClipboardText } from './noteBlockClipboard';
import type { NoteBlock } from './types';

function block(
  id: string,
  type: NoteBlock['type'] = 'text',
  content: Record<string, unknown> = { text: id },
): NoteBlock {
  return {
    id,
    document_id: 'doc',
    parent_block_id: null,
    type,
    order_index: 0,
    content,
    created_at: '',
    updated_at: '',
  };
}

describe('resolvePasteInsertMode (C6)', () => {
  it('fills blank text-like anchors', () => {
    expect(resolvePasteInsertMode(
      block('a', 'todo', { text: '', html: '' }),
      [{ type: 'todo', text: 'x' }],
    )).toBe('fill-anchor');
  });

  it('inserts after when anchor already has content', () => {
    expect(resolvePasteInsertMode(
      block('a', 'text', { text: 'keep me' }),
      [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }],
    )).toBe('insert-after');
  });

  it('uses liveContent over stale props so typing is not wiped', () => {
    expect(resolvePasteInsertMode(
      block('a', 'todo', { text: '', html: '' }),
      [{ type: 'todo', text: 'pasted' }],
      { liveContent: { text: 'already typed', checked: false } },
    )).toBe('insert-after');
  });

  it('forceInsertAfter never fills (block clipboard)', () => {
    expect(resolvePasteInsertMode(
      block('a', 'text', { text: '' }),
      [{ type: 'text', text: 'x' }],
      { forceInsertAfter: true },
    )).toBe('insert-after');
  });
});

describe('resolveCrossSelectClipboardPlain (C6)', () => {
  it('writes structured NOTE_BLOCKS_JSON for multi-block cross select', () => {
    const blocks = [block('a'), block('b')];
    const plain = resolveCrossSelectClipboardPlain({
      blocks,
      blockIds: ['a', 'b'],
      plainFallback: 'a\nb',
    });
    expect(plain).toBeTruthy();
    expect(parseBlockClipboardText(plain!)).not.toBeNull();
  });

  it('keeps plain fallback for single-block slice', () => {
    expect(resolveCrossSelectClipboardPlain({
      blocks: [block('a')],
      blockIds: ['a'],
      plainFallback: 'partial',
    })).toBe('partial');
  });
});

describe('resolveStructuredBlocksClipboardPlain', () => {
  it('round-trips selected forest', () => {
    const blocks = [
      block('root', 'todo', { text: 'root', checked: false }),
      { ...block('child', 'text', { text: 'child' }), parent_block_id: 'root', order_index: 0 },
    ];
    const plain = resolveStructuredBlocksClipboardPlain(blocks, ['root']);
    expect(parseBlockClipboardText(plain!)?.blocks[0].type).toBe('todo');
  });
});

describe('shouldApplyStructuralPasteSpecs', () => {
  it('treats multi and non-text as structural; single text(+html) stays TipTap', () => {
    expect(shouldApplyStructuralPasteSpecs([{ type: 'text', text: 'a' }])).toBe(false);
    expect(shouldApplyStructuralPasteSpecs([{ type: 'text', text: 'a', html: '<p>a</p>' }])).toBe(false);
    expect(shouldApplyStructuralPasteSpecs([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
    ])).toBe(true);
    expect(shouldApplyStructuralPasteSpecs([{ type: 'heading', text: 'H' }])).toBe(true);
  });

  it('claims single same-type nest so apply does not silent-drop', () => {
    expect(shouldApplyStructuralPasteSpecs([
      { type: 'bulletList', text: 'child', listNestLevel: 1 },
    ])).toBe(true);
    expect(shouldApplyStructuralPasteSpecs([
      { type: 'todo', text: 'parent', children: [{ type: 'todo', text: 'child' }] },
    ])).toBe(true);
  });
});
