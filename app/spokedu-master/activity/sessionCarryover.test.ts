import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildNextSessionCarryoverInput, isCarryoverDuplicate, selectableCarryoverIds } from './sessionCarryover';
const p = (id: string, programId: number | null, preset: string | null, completed = true): MasterSessionDto['programs'][number] => ({ id, sourceType: preset ? 'spomove' : 'program', programId, spomovePresetId: preset, programTitle: id, sortOrder: 0, isCompleted: completed });
describe('selective activity carryover', () => {
  it('uses exact source SessionProgram ids without completion inference', () => expect(selectableCarryoverIds([p('a', 1, null, true), p('b', 2, null, false)], [], new Set([1, 2]), true)).toEqual(['a', 'b']));
  it('disables existing Program and SPOMOVE identities', () => { expect(isCarryoverDuplicate(p('a', 1, null), [p('target', 1, null)])).toBe(true); expect(isCarryoverDuplicate(p('s', null, 'preset'), [p('target-s', null, 'preset')])).toBe(true); });
  it('excludes unavailable content and SPOMOVE without entitlement', () => expect(selectableCarryoverIds([p('a', 1, null), p('b', 2, null), p('s', null, 'preset')], [], new Set([1]), false)).toEqual(['a']));
  it('builds all, selective, and empty carryover inputs without sending an invalid empty selection', () => {
    expect(buildNextSessionCarryoverInput('all', ['a', 'b'], [])).toEqual({ sourceSessionProgramIds: ['a', 'b'] });
    expect(buildNextSessionCarryoverInput('selective', ['a', 'b'], ['b', 'unavailable'])).toEqual({ sourceSessionProgramIds: ['b'] });
    expect(buildNextSessionCarryoverInput('selective', ['a', 'b'], [])).toEqual({ copyPrograms: false });
    expect(buildNextSessionCarryoverInput('none', ['a', 'b'], ['a'])).toEqual({ copyPrograms: false });
  });
});
