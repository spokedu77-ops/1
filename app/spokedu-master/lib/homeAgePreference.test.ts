import { describe, expect, it } from 'vitest';

import type { Program } from '../types';
import {
  compareByAgeGroupPreference,
  scoreProgramForAgeGroups,
  sortProgramsByAgeGroupPreference,
} from './homeAgePreference';

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'p1',
    title: '테스트',
    category: '조절형',
    grade: '초등 전 학년',
    space: '체육관',
    description: '',
    steps: [],
    equipment: [],
    tags: [],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: false,
    isNew: false,
    ...overrides,
  };
}

describe('homeAgePreference', () => {
  it('returns 0 when ageGroups are empty so existing order stays', () => {
    const program = makeProgram({ grade: '미취학' });
    expect(scoreProgramForAgeGroups(program, [])).toBe(0);
    expect(scoreProgramForAgeGroups(program, undefined)).toBe(0);
  });

  it('boosts preschool programs for 유치부 onboarding', () => {
    const preschool = makeProgram({ id: 'pre', grade: '미취학' });
    const elementary = makeProgram({ id: 'el', grade: '초등학생 이상' });
    expect(scoreProgramForAgeGroups(preschool, ['유치부'])).toBeGreaterThan(
      scoreProgramForAgeGroups(elementary, ['유치부']),
    );
  });

  it('boosts elementary programs for 초등 onboarding', () => {
    const preschool = makeProgram({ id: 'pre', grade: '미취학' });
    const elementary = makeProgram({ id: 'el', grade: '초등 3~6학년' });
    expect(compareByAgeGroupPreference(preschool, elementary, ['초등 저학년'])).toBeGreaterThan(0);
  });

  it('sorts stably without dropping programs', () => {
    const programs = [
      makeProgram({ id: 'a', grade: '초등학생 이상', title: 'A' }),
      makeProgram({ id: 'b', grade: '미취학', title: 'B' }),
      makeProgram({ id: 'c', grade: '초등학생 이상', title: 'C' }),
    ];
    const sorted = sortProgramsByAgeGroupPreference(programs, ['유치부']);
    expect(sorted.map((program) => program.id)).toEqual(['b', 'a', 'c']);
    expect(sorted).toHaveLength(3);
  });
});
