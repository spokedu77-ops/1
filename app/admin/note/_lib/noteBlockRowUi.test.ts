import { describe, expect, it } from 'vitest';
import { blockExternalizesChildren } from './noteBlockRowUi';

describe('blockExternalizesChildren', () => {
  it('renders toggle children inline in NoteToggleBlock', () => {
    expect(blockExternalizesChildren('toggle')).toBe(false);
  });

  it('keeps list children as external sibling rows', () => {
    expect(blockExternalizesChildren('bulletList')).toBe(true);
    expect(blockExternalizesChildren('numberedList')).toBe(true);
  });

  it('renders column containers inline', () => {
    expect(blockExternalizesChildren('columnList')).toBe(false);
    expect(blockExternalizesChildren('column')).toBe(false);
  });
});
