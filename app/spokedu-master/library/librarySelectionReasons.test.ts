import { describe, expect, it } from 'vitest';

import type { Program } from '../types';
import {
  formatProgramSelectionReasons,
  getProgramSelectionReasons,
  LIBRARY_SELECTION_REASON_IDS,
  LIBRARY_SELECTION_REASON_MAX,
  LIBRARY_SELECTION_REASONS,
  programMatchesSelectionReason,
} from './librarySelectionReasons';

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'p1',
    title: '테스트 수업',
    category: '조절형',
    grade: '초등 전 학년',
    space: '체육관',
    description: '기본 설명',
    steps: [],
    equipment: ['마커콘 8개'],
    tags: [],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: false,
    isNew: false,
    ...overrides,
  };
}

describe('librarySelectionReasons', () => {
  it('keeps the public reason vocabulary and maximum count aligned', () => {
    expect(LIBRARY_SELECTION_REASON_MAX).toBe(3);
    expect(LIBRARY_SELECTION_REASON_IDS).toHaveLength(Object.keys(LIBRARY_SELECTION_REASONS).length);
    for (const id of LIBRARY_SELECTION_REASON_IDS) {
      expect(LIBRARY_SELECTION_REASONS[id].id).toBe(id);
      expect(LIBRARY_SELECTION_REASONS[id].label.length).toBeGreaterThan(0);
    }
  });

  it('maps narrow space and low equipment from structured fields', () => {
    const program = makeProgram({
      space: '교실',
      equipment: ['준비물 없음'],
      tags: ['인원:팀전'],
    });

    const labels = getProgramSelectionReasons(program).map((reason) => reason.label);
    expect(labels).toContain('좁은 공간');
    expect(labels).toContain('교구 적음');
    expect(labels).toContain('팀전');
    expect(labels.length).toBeLessThanOrEqual(3);
  });

  it('maps SPOMOVE only from explicit flag or official preset intersection (no tag-only)', () => {
    expect(programMatchesSelectionReason(makeProgram({ hasSpomoveConnection: true }), 'spomove')).toBe(true);
    expect(
      programMatchesSelectionReason(makeProgram({ tags: ['SPOMOVE 연계'] }), 'spomove'),
    ).toBe(false);
    expect(
      programMatchesSelectionReason(
        makeProgram({
          lessonDetail: {
            recommendedAge: '',
            recommendedPlayers: '',
            objective: '',
            developmentFocus: '',
            coachScript: '',
            parentNote: '',
            fieldTips: [],
            variations: [],
            safetyNotes: [],
            relatedSpomoveIds: ['reactTrain'],
            briefingNotes: [],
          },
        }),
        'spomove',
      ),
    ).toBe(false);
    expect(
      programMatchesSelectionReason(
        makeProgram({
          lessonDetail: {
            recommendedAge: '',
            recommendedPlayers: '',
            objective: '',
            developmentFocus: '',
            coachScript: '',
            parentNote: '',
            fieldTips: [],
            variations: [],
            safetyNotes: [],
            relatedSpomoveIds: ['reaction-cognition-space-direction-01'],
            briefingNotes: [],
          },
        }),
        'spomove',
      ),
    ).toBe(true);
  });

  it('does not treat title-only ready_now or description-only reaction as enough', () => {
    expect(
      programMatchesSelectionReason(
        makeProgram({ title: '바로 진행 워밍업', description: '일반 설명' }),
        'ready_now',
      ),
    ).toBe(false);
    expect(
      programMatchesSelectionReason(
        makeProgram({ title: '반응 수업', description: '반응을 키웁니다', tags: [] }),
        'reaction',
      ),
    ).toBe(false);
    expect(
      programMatchesSelectionReason(
        makeProgram({ tags: ['반응'] }),
        'reaction',
      ),
    ).toBe(true);
  });

  it('formats card support meta from controlled vocabulary only', () => {
    const meta = formatProgramSelectionReasons(
      makeProgram({
        space: '좁은 실내 공간',
        description: '수업 전환에 바로 활용할 수 있습니다.',
        tags: ['반응', '인원:개인전'],
      }),
    );
    expect(meta).toContain('좁은 공간');
    expect(meta).toContain('바로 진행');
    expect(meta.split(' · ').length).toBeLessThanOrEqual(3);
  });
});
