import { describe, expect, it } from 'vitest';
import {
  allowsLocalChildBlocks,
  isPageLinkBlock,
  isTodoBlock,
  isToggleBlock,
  supportsInsideDropTarget,
} from './noteBlockSemantics';

describe('note block semantics', () => {
  it('distinguishes page drop targets from local tree containers', () => {
    expect(isPageLinkBlock({ type: 'page' })).toBe(true);
    expect(supportsInsideDropTarget('page')).toBe(true);
    expect(allowsLocalChildBlocks({ type: 'page' })).toBe(false);
  });

  it('allows toggles and list-like blocks to own local children', () => {
    expect(isToggleBlock({ type: 'toggle' })).toBe(true);
    expect(supportsInsideDropTarget('toggle')).toBe(true);
    expect(allowsLocalChildBlocks({ type: 'toggle' })).toBe(true);
    expect(supportsInsideDropTarget('bulletList')).toBe(true);
    expect(allowsLocalChildBlocks({ type: 'bulletList' })).toBe(true);
  });

  it('identifies checklist blocks as text blocks with checked state', () => {
    expect(isTodoBlock({ type: 'todo' })).toBe(true);
    expect(supportsInsideDropTarget('todo')).toBe(false);
    expect(allowsLocalChildBlocks({ type: 'todo' })).toBe(true);
  });
});
