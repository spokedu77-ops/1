import { describe, expect, it } from 'vitest';
import {
  parseAdminNoteDocumentIdFromHref,
  plainMultilineToInsertHtml,
  shouldHandlePlainMultilinePaste,
  splitClipboardLines,
  tryParsePastedNotePageLink,
} from './notePaste';

describe('notePaste', () => {
  it('splits windows newlines', () => {
    expect(splitClipboardLines('a\r\nb')).toEqual(['a', 'b']);
  });

  it('detects multiline paste', () => {
    expect(shouldHandlePlainMultilinePaste('one')).toBe(false);
    expect(shouldHandlePlainMultilinePaste('one\ntwo')).toBe(true);
  });

  it('builds paragraph html', () => {
    expect(plainMultilineToInsertHtml(['a', 'b'])).toBe('<p>a</p><p>b</p>');
  });

  it('parses admin note url paste', () => {
    expect(tryParsePastedNotePageLink('/admin/note?id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toEqual({
      href: '/admin/note?id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      label: '페이지 열기',
    });
  });

  it('parses document id from href', () => {
    expect(parseAdminNoteDocumentIdFromHref('/admin/note?id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'))
      .toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });
});
