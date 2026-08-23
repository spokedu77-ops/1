import { describe, expect, it } from 'vitest';

import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { buildTodaySessionCards } from './todaySessionsModel';

const classItem: MasterClassDto = {
  id: 'class-a', name: '양화초 늘봄체육', studentIds: ['s1', 's2'], createdAt: '', updatedAt: '',
};

function session(id: string, startAt: string, overrides: Partial<MasterSessionDto> = {}): MasterSessionDto {
  return {
    id, classId: classItem.id, className: classItem.name, startAt,
    endAt: new Date(new Date(startAt).getTime() + 3_600_000).toISOString(),
    status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

const program = (id: string, sourceType: 'program' | 'spomove' = 'program') => ({
  id, sourceType, programId: sourceType === 'program' ? Number(id.replace(/\D/g, '')) || 1 : null,
  spomovePresetId: sourceType === 'spomove' ? `preset-${id}` : null,
  programTitle: `활동 ${id}`, sortOrder: 0, isCompleted: false,
});

describe('Today Sessions operations model', () => {
  it('uses the Seoul business day at midnight boundaries', () => {
    const cards = buildTodaySessionCards([
      session('late', '2026-08-23T14:30:00.000Z'),
      session('early', '2026-08-23T15:30:00.000Z'),
    ], [classItem], '2026-08-23');
    expect(cards.map((item) => item.session.id)).toEqual(['late']);
  });

  it('keeps two sessions of the same class as independent cards', () => {
    const cards = buildTodaySessionCards([
      session('one', '2026-08-23T01:00:00.000Z'),
      session('two', '2026-08-23T05:00:00.000Z'),
    ], [classItem], '2026-08-23');
    expect(cards.map((item) => item.session.id)).toEqual(['one', 'two']);
  });

  it('does not flatten four activities into four lessons', () => {
    const cards = buildTodaySessionCards([
      session('one', '2026-08-23T01:00:00.000Z', { programs: [program('1'), program('2'), program('3'), program('4')] }),
    ], [classItem], '2026-08-23');
    expect(cards).toHaveLength(1);
    expect(cards[0].activityCount).toBe(4);
  });

  it('treats a SPOMOVE-only session as a lesson', () => {
    const [card] = buildTodaySessionCards([
      session('spomove', '2026-08-23T01:00:00.000Z', { programs: [program('x', 'spomove')] }),
    ], [classItem], '2026-08-23');
    expect(card.hasSpomove).toBe(true);
    expect(card.ctaLabel).toBe('수업 열기');
  });

  it.each([
    ['scheduled', 0, '수업 준비'],
    ['scheduled', 1, '수업 열기'],
    ['completed', 1, '수업 보기'],
    ['cancelled', 1, null],
  ] as const)('derives the %s CTA without adding status', (status, activityCount, label) => {
    const [card] = buildTodaySessionCards([
      session('target', '2026-08-23T01:00:00.000Z', { status, programs: Array.from({ length: activityCount }, (_, index) => program(String(index + 1))) }),
    ], [classItem], '2026-08-23');
    expect(card.ctaLabel).toBe(label);
    expect(card.href).toBe('/spokedu-master/activity?session=target');
  });
});
