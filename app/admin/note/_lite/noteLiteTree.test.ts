import { describe, expect, it } from 'vitest';
import { createEmptyLiteBlock, detectMarkdownType, indentBlock, insertBlockAfter, moveBlockAfter, moveBlockBefore } from './noteLiteTree';
import { siblingRelativeOrderSignature } from '@/app/lib/note/noteLiteInvariants';

describe('noteLiteTree', () => {
  it('insertAfter keeps previous siblings in place', () => {
    const a = createEmptyLiteBlock('d', 'text', null);
    a.id = 'a';
    const b = createEmptyLiteBlock('d', 'text', null);
    b.id = 'b';
    const start = insertBlockAfter([], null, a);
    const next = insertBlockAfter(start, 'a', b);
    expect(next.map((x) => x.id)).toEqual(['a', 'b']);
    expect(siblingRelativeOrderSignature(next)).toBe('root:a|root:b');
  });

  it('indent nests under previous sibling', () => {
    const a = { ...createEmptyLiteBlock('d', 'text', null), id: 'a' };
    const b = { ...createEmptyLiteBlock('d', 'text', null), id: 'b' };
    const start = insertBlockAfter(insertBlockAfter([], null, a), 'a', b);
    const nested = indentBlock(start, 'b');
    expect(nested.find((x) => x.id === 'b')?.parent_block_id).toBe('a');
  });

  it('moveBlockBefore does not drop sibling order of others', () => {
    const a = { ...createEmptyLiteBlock('d', 'text', null), id: 'a' };
    const b = { ...createEmptyLiteBlock('d', 'text', null), id: 'b' };
    const c = { ...createEmptyLiteBlock('d', 'text', null), id: 'c' };
    let rows = insertBlockAfter([], null, a);
    rows = insertBlockAfter(rows, 'a', b);
    rows = insertBlockAfter(rows, 'b', c);
    const moved = moveBlockBefore(rows, 'c', 'a');
    expect(moved.filter((x) => !x.parent_block_id).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('moveBlockAfter places the dragged block after the target', () => {
    const a = { ...createEmptyLiteBlock('d', 'text', null), id: 'a' };
    const b = { ...createEmptyLiteBlock('d', 'text', null), id: 'b' };
    const c = { ...createEmptyLiteBlock('d', 'text', null), id: 'c' };
    let rows = insertBlockAfter([], null, a);
    rows = insertBlockAfter(rows, 'a', b);
    rows = insertBlockAfter(rows, 'b', c);
    const moved = moveBlockAfter(rows, 'a', 'c');
    expect(moved.filter((x) => !x.parent_block_id).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('detectMarkdownType', () => {
  it('turns "- " and "* " into a bullet after the space', () => {
    expect(detectMarkdownType('- ')).toEqual({ type: 'bulletList', text: '' });
    expect(detectMarkdownType('* hello')).toEqual({ type: 'bulletList', text: 'hello' });
    expect(detectMarkdownType('-')).toBeNull();
    expect(detectMarkdownType('*')).toBeNull();
  });
});
