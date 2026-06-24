import { describe, expect, it } from 'vitest';
import {
  normalizeTodoBlockContentRecord,
  patchTodoChecked,
  resolveTodoChecked,
} from './noteTodoContent';

describe('noteTodoContent', () => {
  it('normalizeTodoBlockContentRecord coerces checked to boolean', () => {
    expect(normalizeTodoBlockContentRecord({ text: 'a', checked: 1 as unknown as boolean })).toEqual({
      text: 'a',
      checked: false,
    });
    expect(normalizeTodoBlockContentRecord({ checked: true }).checked).toBe(true);
  });

  it('patchTodoChecked toggles checked', () => {
    expect(patchTodoChecked({ text: 'x', checked: false }).checked).toBe(true);
    expect(patchTodoChecked({ text: 'x', checked: true }).checked).toBe(false);
  });

  it('resolveTodoChecked', () => {
    expect(resolveTodoChecked({ checked: true })).toBe(true);
    expect(resolveTodoChecked({ checked: false })).toBe(false);
    expect(resolveTodoChecked(null)).toBe(false);
  });
});
