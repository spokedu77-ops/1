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

  it('parses Notion-like "." bullet markers as list items without keeping the glyph', () => {
    expect(parseMarkdownPlainToBlocks('. 육상\n. 긴줄넘기')).toEqual([
      { type: 'bulletList', text: '육상', listNestLevel: 0 },
      { type: 'bulletList', text: '긴줄넘기', listNestLevel: 0 },
    ]);
  });

  it('does not duplicate nested child text into the parent bullet line', () => {
    const specs = parseMarkdownPlainToBlocks('- 긴줄넘기\n  - 하위');
    expect(specs).toEqual([
      { type: 'bulletList', text: '긴줄넘기', listNestLevel: 0 },
      { type: 'bulletList', text: '하위', listNestLevel: 1 },
    ]);
    expect(specs?.filter((spec) => spec.text.includes('긴줄넘기'))).toHaveLength(1);
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
