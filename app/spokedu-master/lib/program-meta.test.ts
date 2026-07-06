import { describe, expect, it } from 'vitest';
import type { Program } from '../types';
import {
  getProgramHomeReadiness,
  getProgramQualityReport,
  getSupportedOfficialSpomovePresets,
  isPlaceholderMeta,
  isProgramHomeRecommendationEligible,
} from './program-meta';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../spomove/officialSpomovePresets';

function program(overrides: Partial<Program> = {}): Program {
  return {
    id: 'program-1',
    title: 'Balance lesson',
    category: 'movement',
    grade: 'grade 1',
    space: 'classroom',
    description: 'Use this lesson before a weekly class.',
    steps: ['Set cones', 'Run the relay'],
    equipment: ['cones'],
    tags: [],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: false,
    isNew: false,
    lessonDetail: {
      recommendedAge: 'grade 1',
      recommendedPlayers: '8 students',
      objective: 'Move safely',
      developmentFocus: 'Balance',
      coachScript: '',
      parentNote: '',
      fieldTips: [],
      variations: ['Make the path shorter'],
      safetyNotes: ['Keep enough space between students.'],
      relatedSpomoveIds: [],
      setupImageUrl: '/images/spokedu-master/setup.jpg',
      rules: ['Start on signal', 'Return to line'],
    },
    ...overrides,
  };
}

describe('program home recommendation readiness', () => {
  it('accepts content with decision, preparation, execution, teaching, and preview data', () => {
    const item = program();

    expect(getProgramQualityReport(item).status).toBe('READY');
    expect(isProgramHomeRecommendationEligible(item)).toBe(true);
    expect(getProgramHomeReadiness(item)).toBeGreaterThanOrEqual(7);
  });

  it('keeps limited content searchable and available for home recommendations', () => {
    const item = program({
      lessonDetail: {
        ...program().lessonDetail!,
        safetyNotes: [],
      },
    });

    expect(getProgramQualityReport(item).status).toBe('LIMITED');
    expect(isProgramHomeRecommendationEligible(item)).toBe(true);
  });

  it('treats placeholder decision metadata as not ready', () => {
    const item = program({ grade: 'undefined', space: 'null' });

    expect(isPlaceholderMeta(item.grade)).toBe(true);
    expect(getProgramQualityReport(item).status).toBe('INCOMPLETE');
    expect(isProgramHomeRecommendationEligible(item)).toBe(false);
  });

  it('allows no-equipment lessons only when the original content explicitly says so', () => {
    expect(getProgramQualityReport(program({ equipment: ['No equipment'] }))).toMatchObject({ status: 'READY' });
    expect(getProgramQualityReport(program({ equipment: [] }))).toMatchObject({ status: 'INCOMPLETE' });
  });

  it('supports step-led lessons without requiring separate rule fields', () => {
    const item = program({
      steps: ['Move to the cone', 'Return to the line'],
      lessonDetail: {
        ...program().lessonDetail!,
        rules: [],
      },
    });

    expect(getProgramQualityReport(item).status).toBe('READY');
  });

  it('does not treat a special-support tag as ready without actual support guidance', () => {
    const taggedOnly = program({
      tags: ['specialSupport'],
      lessonDetail: {
        ...program().lessonDetail!,
        variations: [],
        fieldTips: [],
        coachScript: '',
        briefingNotes: [],
      },
    });
    const supported = program({
      tags: ['specialSupport'],
      lessonDetail: {
        ...program().lessonDetail!,
        fieldTips: ['Reduce speed and repeat the same cue twice.'],
      },
    });

    expect(getProgramQualityReport(taggedOnly).status).toBe('LIMITED');
    expect(getProgramQualityReport(supported).status).toBe('READY');
  });

  it('requires explicit context before exposing official SPOMOVE links', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY[0]!;
    const validButUnexplained = program({
      lessonDetail: {
        ...program().lessonDetail!,
        relatedSpomoveIds: [preset.id],
      },
    });
    const supported = program({
      tags: ['SPOMOVE'],
      lessonDetail: {
        ...program().lessonDetail!,
        relatedSpomoveIds: [preset.id],
        briefingNotes: ['Use SPOMOVE as a screen activity before the relay.'],
      },
    });

    expect(getSupportedOfficialSpomovePresets(validButUnexplained)).toHaveLength(0);
    expect(getSupportedOfficialSpomovePresets(supported).map((item) => item.id)).toEqual([preset.id]);
  });
});
