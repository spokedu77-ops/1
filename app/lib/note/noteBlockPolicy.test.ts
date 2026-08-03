import { describe, expect, it } from 'vitest';
import { canPlaceBlockTypeInParent } from './noteBlockPolicy';

describe('canPlaceBlockTypeInParent', () => {
  it('allows todo under todo (checklist nest)', () => {
    expect(canPlaceBlockTypeInParent('todo', 'todo')).toBe(true);
  });

  it('rejects text under todo and page under toggle', () => {
    expect(canPlaceBlockTypeInParent('text', 'todo')).toBe(false);
    expect(canPlaceBlockTypeInParent('page', 'toggle')).toBe(false);
  });
});
