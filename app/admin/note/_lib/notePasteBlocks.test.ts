import { describe, expect, it } from 'vitest';
import {
  contentForPastedBlock,
  pastedBlocksFromPlainLines,
} from './notePasteBlocks';
import { shouldSplitHtmlPaste } from './notePasteHtml';

describe('notePasteBlocks', () => {
  it('maps plain lines to block specs', () => {
    expect(pastedBlocksFromPlainLines('heading', ['Title', 'Body'])).toEqual([
      { type: 'heading', text: 'Title' },
      { type: 'text', text: 'Body' },
    ]);
  });

  it('keeps html and todo checked on pasted content', () => {
    const content = contentForPastedBlock(
      { type: 'todo', text: 'Task', html: '<p><strong>Task</strong></p>', checked: true },
      {},
    );
    expect(content.text).toBe('Task');
    expect(content.html).toBe('<p><strong>Task</strong></p>');
    expect(content.checked).toBe(true);
  });
});

describe('shouldSplitHtmlPaste', () => {
  it('splits multiple blocks', () => {
    expect(shouldSplitHtmlPaste([
      { type: 'heading', text: 'A' },
      { type: 'text', text: 'B' },
    ])).toBe(true);
  });

  it('splits single non-text or rich text block', () => {
    expect(shouldSplitHtmlPaste([{ type: 'heading', text: 'A' }])).toBe(true);
    expect(shouldSplitHtmlPaste([{ type: 'text', text: 'A', html: '<p><b>A</b></p>' }])).toBe(true);
    expect(shouldSplitHtmlPaste([{ type: 'text', text: 'A' }])).toBe(false);
  });
});
