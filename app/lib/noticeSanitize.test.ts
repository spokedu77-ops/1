import { describe, expect, it } from 'vitest';
import { sanitizeNoticeHtml } from './noticeSanitize';

describe('sanitizeNoticeHtml', () => {
  it('removes script tags on the server fallback', () => {
    expect(sanitizeNoticeHtml('<p>공지</p><script>alert(1)</script>')).toBe('<p>공지</p>');
  });

  it('preserves allowed notice markup', () => {
    expect(sanitizeNoticeHtml('<div class="notice"><img src="/a.png" alt="a"><br><span>본문</span></div>')).toBe(
      '<div class="notice"><img src="/a.png" alt="a"><br><span>본문</span></div>',
    );
  });
});
