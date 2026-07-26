import { describe, expect, it } from 'vitest';

import type { Program } from '../types';
import {
  formatProgramSelectionReasons,
  getProgramSelectionReasons,
  LIBRARY_SELECTION_REASON_IDS,
  LIBRARY_SELECTION_REASON_MAX,
  LIBRARY_SELECTION_REASON_STANDARD,
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
  it('locks P1.5 vocab and mapping standard without adding chip UI', () => {
    expect(LIBRARY_SELECTION_REASON_MAX).toBe(3);
    expect(LIBRARY_SELECTION_REASON_IDS).toHaveLength(Object.keys(LIBRARY_SELECTION_REASONS).length);
    for (const id of LIBRARY_SELECTION_REASON_IDS) {
      const standard = LIBRARY_SELECTION_REASON_STANDARD[id];
      expect(standard.id).toBe(id);
      expect(standard.label).toBe(LIBRARY_SELECTION_REASONS[id].label);
      expect(standard.requiredEvidence.length).toBeGreaterThan(8);
    }
    expect(LIBRARY_SELECTION_REASON_STANDARD.team.evidenceLevel).toBe('structured');
    expect(LIBRARY_SELECTION_REASON_STANDARD.solo.evidenceLevel).toBe('structured');
    expect(LIBRARY_SELECTION_REASON_STANDARD.spomove.evidenceLevel).toBe('legacy_mixed');
    expect(LIBRARY_SELECTION_REASON_STANDARD.spomove.pendingP3Tighten).toBe(true);
    expect(LIBRARY_SELECTION_REASON_STANDARD.ready_now.evidenceLevel).toBe('text_only');
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

  it('maps SPOMOVE linkage from flags and tags (legacy until P3)', () => {
    expect(programMatchesSelectionReason(makeProgram({ hasSpomoveConnection: true }), 'spomove')).toBe(true);
    expect(
      programMatchesSelectionReason(makeProgram({ tags: ['SPOMOVE 연계'] }), 'spomove'),
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
