import { describe, expect, it } from 'vitest';
import {
  shouldCreateVisibleBlockFromInput,
  textLikeContentIsBlank,
} from './noteInputContract';

describe('note input contract', () => {
  it('treats text-like empty html as blank content', () => {
    expect(textLikeContentIsBlank({
      text: '',
      html: '<p><br></p>',
    })).toBe(true);
    expect(textLikeContentIsBlank({
      text: '  ',
      html: '<p>&nbsp;</p>',
    })).toBe(true);
    expect(textLikeContentIsBlank({
      text: '7.20 interview',
      html: '<p>7.20 interview</p>',
    })).toBe(false);
  });

  it('blocks automatic blank visible rows from system and paste paths', () => {
    for (const type of ['text', 'todo', 'bulletList', 'numberedList'] as const) {
      expect(shouldCreateVisibleBlockFromInput({
        type,
        content: { text: '', html: '<p></p>' },
        reason: 'system',
      })).toBe(false);
      expect(shouldCreateVisibleBlockFromInput({
        type,
        content: { text: '', html: '<p><br></p>' },
        reason: 'paste',
      })).toBe(false);
    }
  });

  it('allows deliberate user-created empty editable rows', () => {
    expect(shouldCreateVisibleBlockFromInput({
      type: 'todo',
      content: { text: '', checked: false },
      reason: 'enter',
    })).toBe(true);
    expect(shouldCreateVisibleBlockFromInput({
      type: 'text',
      content: { text: '' },
      reason: 'explicit',
    })).toBe(true);
  });

  it('never blocks structural non-text blocks through the blank guard', () => {
    expect(shouldCreateVisibleBlockFromInput({
      type: 'divider',
      content: {},
      reason: 'paste',
    })).toBe(true);
    expect(shouldCreateVisibleBlockFromInput({
      type: 'table',
      content: {},
      reason: 'system',
    })).toBe(true);
  });
});
