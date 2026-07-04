import { describe, expect, it } from 'vitest';
import { parseMarkdownPlainToBlocks, shouldSplitMarkdownPaste } from './notePasteMarkdown';

describe('parseMarkdownPlainToBlocks', () => {
  it('returns null for plain single-line text', () => {
    expect(parseMarkdownPlainToBlocks('hello world')).toBeNull();
  });

  it('parses headings and bullets', () => {
    expect(parseMarkdownPlainToBlocks('# Title\n- Item A\n- Item B')).toEqual([
      { type: 'heading', text: 'Title' },
      { type: 'bulletList', text: 'Item A', listNestLevel: 0 },
      { type: 'bulletList', text: 'Item B', listNestLevel: 0 },
    ]);
  });

  it('parses nested bullets with indent depth', () => {
    expect(parseMarkdownPlainToBlocks('- Root\n  - Child')).toEqual([
      { type: 'bulletList', text: 'Root', listNestLevel: 0 },
      { type: 'bulletList', text: 'Child', listNestLevel: 1 },
    ]);
  });

  it('parses fenced code blocks', () => {
    expect(parseMarkdownPlainToBlocks('```ts\nconst x = 1;\n```')).toEqual([
      { type: 'code', text: 'const x = 1;', language: 'ts' },
    ]);
  });

  it('parses todo, quote, callout, divider', () => {
    expect(parseMarkdownPlainToBlocks('[x] Done\n> Quote\n!! Callout\n---')).toEqual([
      { type: 'todo', text: 'Done', checked: true, listNestLevel: 0 },
      { type: 'quote', text: 'Quote' },
      { type: 'callout', text: 'Callout' },
      { type: 'divider', text: '' },
    ]);
  });
});

describe('shouldSplitMarkdownPaste', () => {
  it('splits multiple specs or non-text blocks', () => {
    expect(shouldSplitMarkdownPaste([
      { type: 'heading', text: 'A' },
      { type: 'text', text: 'B' },
    ])).toBe(true);
    expect(shouldSplitMarkdownPaste([{ type: 'bulletList', text: 'A' }])).toBe(true);
    expect(shouldSplitMarkdownPaste([{ type: 'text', text: 'A' }])).toBe(false);
  });
});
