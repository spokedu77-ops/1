import { describe, expect, it, vi } from 'vitest';
import { resolveEnterAfterHtml } from './noteEnterSplitHtml';

describe('resolveEnterAfterHtml (C2 EnterMarks)', () => {
  it('keeps editor HTML slice when marks are present — never plain-rebuilds over it', () => {
    const plainRebuild = vi.fn((text: string) => `<p>${text}</p>`);
    const afterHtml = resolveEnterAfterHtml({
      afterHtmlFromEditor: '<p><strong>굵게</strong> 뒤</p>',
      afterText: '굵게 뒤',
      plainRebuild,
    });
    expect(afterHtml).toBe('<p><strong>굵게</strong> 뒤</p>');
    expect(plainRebuild).not.toHaveBeenCalled();
  });

  it('falls back to plain rebuild only when editor slice is empty', () => {
    const plainRebuild = vi.fn((text: string) => `<p>${text}</p>`);
    const afterHtml = resolveEnterAfterHtml({
      afterHtmlFromEditor: '<p></p>',
      afterText: 'plain',
      plainRebuild,
    });
    expect(afterHtml).toBe('<p>plain</p>');
    expect(plainRebuild).toHaveBeenCalledWith('plain');
  });
});
