import { describe, expect, it } from 'vitest';
import {
  canSplitMultilinePasteToBlocks,
  contentForMultilinePasteLine,
  insertTypeForMultilinePasteFollowUp,
} from './noteMultilinePaste';

describe('noteMultilinePaste', () => {
  it('allows split for text blocks', () => {
    expect(canSplitMultilinePasteToBlocks('text')).toBe(true);
    expect(canSplitMultilinePasteToBlocks('code')).toBe(false);
  });

  it('follow-up after heading becomes text', () => {
    expect(insertTypeForMultilinePasteFollowUp('heading2')).toBe('text');
    expect(insertTypeForMultilinePasteFollowUp('bulletList')).toBe('bulletList');
  });

  it('builds line content without html', () => {
    const content = contentForMultilinePasteLine('todo', '할 일', {});
    expect(content.text).toBe('할 일');
    expect(content.checked).toBe(false);
    expect(content.depth).toBeUndefined();
    expect(content.html).toBeUndefined();
  });
});
