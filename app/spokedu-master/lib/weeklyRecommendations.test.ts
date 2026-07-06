import { describe, expect, it } from 'vitest';
import type { Program } from '../types';
import { selectWeeklyRecommendationSlots } from './weeklyRecommendations';

function program(
  id: string,
  title: string,
  input: Partial<Program> = {},
): Program {
  return {
    id,
    title,
    category: '',
    grade: '',
    space: '',
    description: '',
    steps: [],
    equipment: [],
    tags: [],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: false,
    isNew: false,
    ...input,
  };
}

const select = (programs: Program[]) =>
  selectWeeklyRecommendationSlots(programs, {
    isRecommendationEligible: (item) => item.description !== 'ineligible',
    compareFallback: (a, b) =>
      Number(b.isHot) - Number(a.isHot) ||
      Number(b.isNew) - Number(a.isNew) ||
      (a.homeSortOrder ?? 9999) - (b.homeSortOrder ?? 9999),
    normalizeTitle: (title) => title.toLowerCase().replace(/\s+/g, ''),
  });

describe('selectWeeklyRecommendationSlots', () => {
  it('keeps four explicit admin slots in order without fallback', () => {
    const result = select([
      program('4', 'D', { isHot: true, homeSortOrder: 4 }),
      program('2', 'B', { isHot: true, homeSortOrder: 2 }),
      program('1', 'A', { isHot: true, homeSortOrder: 1 }),
      program('3', 'C', { isHot: true, homeSortOrder: 3 }),
      program('5', 'Fallback', { isHot: true, homeSortOrder: 5 }),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['1', '2', '3', '4']);
    expect(result.fallbackPrograms).toHaveLength(0);
  });

  it('fills only empty slots while preserving explicit positions', () => {
    const result = select([
      program('1', 'A', { isHot: true, homeSortOrder: 1 }),
      program('3', 'C', { isHot: true, homeSortOrder: 3 }),
      program('b', 'Fallback B', { isNew: true }),
      program('d', 'Fallback D'),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['1', 'b', '3', 'd']);
  });

  it('does not treat curriculum display order fallback as an explicit slot', () => {
    const result = select([
      program('regular', 'Regular', { isHot: false, homeSortOrder: 1 }),
      program('featured', 'Featured', { isHot: true, homeSortOrder: 2 }),
    ]);
    expect(result.explicitPrograms.map((item) => item.id)).toEqual(['featured']);
  });

  it('does not treat hot programs outside slots as explicit', () => {
    const result = select([program('5', 'Hot Five', { isHot: true, homeSortOrder: 5 })]);
    expect(result.explicitPrograms).toHaveLength(0);
    expect(result.fallbackPrograms.map((item) => item.id)).toEqual(['5']);
  });

  it('removes explicit programs with equal titles and fills the open slot with ready fallback', () => {
    const result = select([
      program('1', 'Same', { isHot: true, homeSortOrder: 1 }),
      program('2', 'Same', { isHot: true, homeSortOrder: 2 }),
      program('3', 'Fallback'),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['1', '3']);
    expect(result.slotDiagnostics).toContainEqual({ slot: 2, programId: '2', reason: 'duplicate_title', keptId: '1' });
  });

  it('removes ineligible explicit programs instead of treating admin slots as ready', () => {
    const result = select([
      program('1', 'Admin', {
        isHot: true,
        homeSortOrder: 1,
        description: 'ineligible',
      }),
    ]);
    expect(result.programs).toHaveLength(0);
    expect(result.explicitPrograms).toHaveLength(0);
    expect(result.slotDiagnostics).toContainEqual({ slot: 1, programId: '1', reason: 'not_ready' });
  });

  it('replaces an ineligible explicit slot with a ready fallback when available', () => {
    const result = select([
      program('1', 'Admin', {
        isHot: true,
        homeSortOrder: 1,
        description: 'ineligible',
      }),
      program('2', 'Ready fallback'),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['2']);
    expect(result.fallbackPrograms.map((item) => item.id)).toEqual(['2']);
  });

  it('removes fallback id duplicates', () => {
    const result = select([
      program('x', 'One'),
      program('x', 'Two', { isNew: true }),
    ]);
    expect(result.programs.filter((item) => item.id === 'x')).toHaveLength(1);
  });

  it('removes fallback normalized-title duplicates', () => {
    const result = select([
      program('1', '같은 제목'),
      program('2', '같은제목', { isNew: true }),
    ]);
    expect(result.programs).toHaveLength(1);
  });

  it('fills a missing explicit slot with fallback instead of reporting success silently', () => {
    const result = select([
      program('1', 'A', { isHot: true, homeSortOrder: 1 }),
      program('fallback', 'Fallback'),
    ]);
    expect(result.explicitPrograms).toHaveLength(1);
    expect(result.fallbackPrograms).toHaveLength(1);
  });

  it('does not let fallback replace any of four explicit slots', () => {
    const result = select([
      program('1', 'A', { isHot: true, homeSortOrder: 1 }),
      program('2', 'B', { isHot: true, homeSortOrder: 2 }),
      program('3', 'C', { isHot: true, homeSortOrder: 3 }),
      program('4', 'D', { isHot: true, homeSortOrder: 4 }),
      program('fallback', 'Fallback', { isNew: true }),
    ]);
    expect(result.fallbackPrograms).toHaveLength(0);
  });

  it('keeps only existing ready programs when fewer than four are eligible', () => {
    const result = select([
      program('1', 'Ready 1'),
      program('2', 'Limited', { description: 'ineligible' }),
      program('3', 'Ready 2'),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['1', '3']);
  });

  it('returns no recommendations when no program is eligible', () => {
    const result = select([
      program('1', 'Limited', { description: 'ineligible' }),
      program('2', 'Incomplete', { description: 'ineligible', isHot: true, homeSortOrder: 1 }),
    ]);
    expect(result.programs).toHaveLength(0);
    expect(result.fallbackPrograms).toHaveLength(0);
  });

  it('marks slot conflicts without exposing the ignored program', () => {
    const result = select([
      program('1', 'A', { isHot: true, homeSortOrder: 1 }),
      program('2', 'B', { isHot: true, homeSortOrder: 1 }),
      program('3', 'C'),
    ]);
    expect(result.programs.map((item) => item.id)).toEqual(['1', '3']);
    expect(result.slotConflicts).toEqual([{ slot: 1, keptId: '1', ignoredId: '2' }]);
    expect(result.slotDiagnostics).toContainEqual({ slot: 1, programId: '2', reason: 'slot_conflict', keptId: '1' });
  });

  it('ensures every final recommendation passed the same eligibility check', () => {
    const result = select([
      program('1', 'Ready explicit', { isHot: true, homeSortOrder: 1 }),
      program('2', 'Bad explicit', { isHot: true, homeSortOrder: 2, description: 'ineligible' }),
      program('3', 'Ready fallback'),
      program('4', 'Bad fallback', { description: 'ineligible' }),
    ]);
    expect(result.programs.every((item) => item.description !== 'ineligible')).toBe(true);
    expect(result.programs.map((item) => item.id)).toEqual(['1', '3']);
  });
});
