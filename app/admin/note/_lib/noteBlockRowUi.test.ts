import { describe, expect, it } from 'vitest';
import {
  blockExternalizesChildren,
  resolveNoteBlockHandleFlyoutPosition,
  resolveNoteBlockHandleMenuPosition,
} from './noteBlockRowUi';

describe('blockExternalizesChildren', () => {
  it('renders toggle children inline in NoteToggleBlock', () => {
    expect(blockExternalizesChildren('toggle')).toBe(false);
  });

  it('keeps list and checklist children as external sibling rows', () => {
    expect(blockExternalizesChildren('bulletList')).toBe(true);
    expect(blockExternalizesChildren('numberedList')).toBe(true);
    expect(blockExternalizesChildren('todo')).toBe(true);
  });

  it('renders column containers inline', () => {
    expect(blockExternalizesChildren('columnList')).toBe(false);
    expect(blockExternalizesChildren('column')).toBe(false);
  });
});

describe('resolveNoteBlockHandleMenuPosition', () => {
  it('flips above the grip when there is not enough space below', () => {
    const pos = resolveNoteBlockHandleMenuPosition({
      anchorRect: { top: 700, bottom: 724, left: 40, right: 64 },
      menuHeight: 292,
      viewportHeight: 800,
      viewportWidth: 1200,
      gap: 4,
      viewportPadding: 8,
    });
    expect(pos.top).toBeLessThan(700);
    expect(pos.top + 292).toBeLessThanOrEqual(800 - 8);
  });

  it('clamps horizontally so the menu stays in the viewport', () => {
    const pos = resolveNoteBlockHandleMenuPosition({
      anchorRect: { top: 100, bottom: 124, left: 1100, right: 1124 },
      menuWidth: 248,
      viewportHeight: 800,
      viewportWidth: 1200,
      viewportPadding: 8,
    });
    expect(pos.left + 248).toBeLessThanOrEqual(1200 - 8);
  });
});

describe('resolveNoteBlockHandleFlyoutPosition', () => {
  it('opens to the left when the right edge would clip', () => {
    const pos = resolveNoteBlockHandleFlyoutPosition({
      rowRect: { top: 200, left: 1000, right: 1100 },
      flyoutWidth: 220,
      viewportWidth: 1200,
      viewportPadding: 8,
    });
    expect(pos.left).toBeLessThan(1000);
  });
});
