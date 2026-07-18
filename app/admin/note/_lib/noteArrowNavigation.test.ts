import { describe, expect, it } from 'vitest';
import { resolveArrowBlockNavigation } from './noteArrowNavigation';

describe('resolveArrowBlockNavigation', () => {
  it('moves to the previous block when ArrowUp starts at the document boundary', () => {
    expect(resolveArrowBlockNavigation({
      key: 'ArrowUp',
      selectionEmpty: true,
      selectionFrom: 1,
      selectionTo: 1,
      docContentSize: 14,
    })).toBe('previous');
  });

  it('moves to the next block when ArrowDown reaches the document boundary', () => {
    expect(resolveArrowBlockNavigation({
      key: 'ArrowDown',
      selectionEmpty: true,
      selectionFrom: 13,
      selectionTo: 13,
      docContentSize: 14,
    })).toBe('next');
  });

  it('moves by visual line when the caret is on the first rendered line', () => {
    expect(resolveArrowBlockNavigation({
      key: 'ArrowUp',
      selectionEmpty: true,
      selectionFrom: 6,
      selectionTo: 6,
      docContentSize: 30,
      caretTop: 120,
      boundaryTop: 122,
    })).toBe('previous');
  });

  it('moves by visual line when the caret is on the last rendered line', () => {
    expect(resolveArrowBlockNavigation({
      key: 'ArrowDown',
      selectionEmpty: true,
      selectionFrom: 12,
      selectionTo: 12,
      docContentSize: 30,
      caretTop: 220,
      boundaryTop: 221,
    })).toBe('next');
  });

  it('does not steal arrows from text selection or middle multiline movement', () => {
    expect(resolveArrowBlockNavigation({
      key: 'ArrowDown',
      selectionEmpty: false,
      selectionFrom: 1,
      selectionTo: 3,
      docContentSize: 14,
    })).toBeNull();
    expect(resolveArrowBlockNavigation({
      key: 'ArrowUp',
      selectionEmpty: true,
      selectionFrom: 8,
      selectionTo: 8,
      docContentSize: 30,
      caretTop: 160,
      boundaryTop: 120,
    })).toBeNull();
  });
});
