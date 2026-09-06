import { describe, expect, it } from 'vitest';

import { COLORS } from '@/app/admin/spomove/training/_player/constants';
import {
  extractStimulusColorIds,
  generateSignal,
} from '@/app/admin/spomove/training/_player/lib/signals';
import {
  resolveStroopWordMoveTarget,
  resolveStroopWordMovementCue,
  STROOP_WORD_MOVE_TASK_CUE,
} from '@/app/admin/spomove/training/_player/lib/resolveStroopWordMoveTarget';
import { canLaunchInternalSpomoveCandidate } from './internalSpomoveCandidateAccess';
import { deriveFamilyIdForPresetId } from './movements/activityFamilies';
import { isHubListedPreset, isHubRunnablePreset } from './movements/isHubVisiblePreset';
import {
  findOfficialSpomovePreset,
  OFFICIAL_SPOMOVE_LIBRARY,
} from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

const CANDIDATE_A = 'stroop-word-switch-movement-v2';
const CANDIDATE_B = 'stroop-word-reverse-movement-v2';
const ARROW_2A = 'stroop-arrow-direction-color-v2';

function publicLibrary() {
  return OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
}

type WordContent = {
  word?: string;
  textHex?: string;
  stroopKind?: string;
  stroopWordTask?: string;
  stroopWordReverse?: boolean;
  stroopWordResponse?: string;
  stroopWordRuleMode?: string;
  stroopArrowResponse?: string;
};

/**
 * Regression freeze: Public stroop L2/L3 still share generateSignal
 * `if (level === 2 || level === 3)` and randomly mix reverse.
 * This file must not change that public path; candidates opt into movement + ruleMode.
 */
describe('SPOMOVE 2B stroop word switch / reverse candidates', () => {
  it('1 — Public 72 유지, 신규 ID는 카탈로그에 없음', () => {
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).toHaveLength(72);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_A);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_B);
    expect(publicLibrary()).toHaveLength(72);
    expect(publicLibrary().map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('2 — 후보 2개는 HOLD + internalCandidate', () => {
    for (const id of [CANDIDATE_A, CANDIDATE_B]) {
      const preset = findOfficialSpomovePreset(id);
      expect(preset).toBeTruthy();
      expect(preset?.catalogStatus).toBe('hold');
      expect(preset?.internalCandidate).toBe(true);
      expect(isHubListedPreset(preset!)).toBe(false);
      expect(isHubRunnablePreset(preset!)).toBe(false);
      expect(getSpomovePadLayoutVariant(preset!)).toBe('grid2x2');
      expect(deriveFamilyIdForPresetId(id)).toBe('stroop-word');
      expect(canLaunchInternalSpomoveCandidate(preset, false)).toBe(false);
      expect(canLaunchInternalSpomoveCandidate(preset, undefined)).toBe(false);
      expect(canLaunchInternalSpomoveCandidate(preset, true)).toBe(true);
    }
    expect(findOfficialSpomovePreset(CANDIDATE_A)?.engine).toEqual({
      mode: 'stroop',
      level: 2,
      stroopWordResponse: 'movement',
      stroopWordRuleMode: 'switch',
    });
    expect(findOfficialSpomovePreset(CANDIDATE_B)?.engine).toEqual({
      mode: 'stroop',
      level: 3,
      stroopWordResponse: 'movement',
      stroopWordRuleMode: 'reverse',
    });
  });

  it('3 — 기존 Public L2/L3 engine 불변 (공유 분기 기록)', () => {
    expect(findOfficialSpomovePreset('stroop-arrow-bg-47')?.engine).toEqual({
      mode: 'stroop',
      level: 2,
    });
    expect(findOfficialSpomovePreset('stroop-word-reverse-48')?.engine).toEqual({
      mode: 'stroop',
      level: 3,
    });
    const l2Kinds = new Set<string>();
    const l3Kinds = new Set<string>();
    for (let i = 0; i < 80; i++) {
      l2Kinds.add((generateSignal('stroop', 2, COLORS)?.content as WordContent).stroopKind ?? '');
      l3Kinds.add((generateSignal('stroop', 3, COLORS)?.content as WordContent).stroopKind ?? '');
    }
    expect(l2Kinds.has('word_meaning') || l2Kinds.has('ink')).toBe(true);
    expect(l2Kinds.has('word_meaning_rev') || l2Kinds.has('ink_rev')).toBe(true);
    expect(l3Kinds.has('word_meaning') || l3Kinds.has('ink')).toBe(true);
    expect(l3Kinds.has('word_meaning_rev') || l3Kinds.has('ink_rev')).toBe(true);
  });

  it('4 — Candidate A는 reverse false만 생성', () => {
    for (let i = 0; i < 80; i++) {
      const sig = generateSignal('stroop', 2, COLORS, {
        stroopWordResponse: 'movement',
        stroopWordRuleMode: 'switch',
      });
      expect(sig?.type).toBe('stroop');
      const content = sig?.content as WordContent;
      expect(content.stroopWordResponse).toBe('movement');
      expect(content.stroopWordReverse).toBe(false);
      expect(content.stroopWordTask === 'meaning' || content.stroopWordTask === 'ink').toBe(true);
      expect(content.stroopKind === 'word_meaning' || content.stroopKind === 'ink').toBe(true);
    }
  });

  it('5 — Candidate B는 reverse true만 생성', () => {
    for (let i = 0; i < 80; i++) {
      const sig = generateSignal('stroop', 3, COLORS, {
        stroopWordResponse: 'movement',
        stroopWordRuleMode: 'reverse',
      });
      expect(sig?.type).toBe('stroop');
      const content = sig?.content as WordContent;
      expect(content.stroopWordResponse).toBe('movement');
      expect(content.stroopWordReverse).toBe(true);
      expect(content.stroopWordTask === 'meaning' || content.stroopWordTask === 'ink').toBe(true);
      expect(content.stroopKind === 'word_meaning_rev' || content.stroopKind === 'ink_rev').toBe(true);
    }
  });

  it('6–9 — 동일 자극 meaning/ink × switch/reverse 타깃 계약', () => {
    const stimulus = {
      word: '빨강',
      wordColorId: 'red',
      textHex: '#3B82F6',
      textColorId: 'blue',
    };
    expect(resolveStroopWordMoveTarget({ ...stimulus, task: 'meaning', reverse: false })).toBe('red');
    expect(resolveStroopWordMoveTarget({ ...stimulus, task: 'ink', reverse: false })).toBe('blue');
    expect(resolveStroopWordMoveTarget({ ...stimulus, task: 'meaning', reverse: true })).toBe('blue');
    expect(resolveStroopWordMoveTarget({ ...stimulus, task: 'ink', reverse: true })).toBe('red');
  });

  it('10–11 — invalid task / color 는 null', () => {
    expect(resolveStroopWordMoveTarget({ word: '빨강', textHex: '#3B82F6', reverse: false })).toBeNull();
    expect(
      resolveStroopWordMoveTarget({
        word: '빨강',
        textHex: '#3B82F6',
        task: 'garbage',
        reverse: false,
      }),
    ).toBeNull();
    expect(
      resolveStroopWordMoveTarget({
        word: '빨강',
        textHex: '#not-a-color',
        task: 'meaning',
        reverse: false,
      }),
    ).toBeNull();
    expect(
      resolveStroopWordMoveTarget({
        word: '없는색',
        textHex: '#3B82F6',
        task: 'ink',
        reverse: false,
      }),
    ).toBeNull();
  });

  it('12 — 기존 L4 불변', () => {
    expect(findOfficialSpomovePreset('stroop-word-bg-49')?.engine).toEqual({
      mode: 'stroop',
      level: 4,
      stroopWordMode: 'bg',
    });
    const sig = generateSignal('stroop', 4, COLORS, { stroopWordMode: 'bg' });
    expect(sig?.type).toBe('stroop');
    const content = sig?.content as WordContent;
    expect(content.stroopKind).toBe('bg_interference');
    expect(content.stroopWordResponse).toBeUndefined();
    expect(content.stroopWordRuleMode).toBeUndefined();
    expect(content.stroopWordReverse).toBeUndefined();
  });

  it('13 — 2A Arrow candidate 불변', () => {
    expect(findOfficialSpomovePreset(ARROW_2A)?.engine).toEqual({
      mode: 'stroop',
      level: 1,
      stroopArrowResponse: 'movement',
    });
    const sig = generateSignal('stroop', 1, COLORS, { stroopArrowResponse: 'movement' });
    expect(sig?.type).toBe('stroop_arrow');
    expect((sig?.content as WordContent).stroopWordResponse).toBeUndefined();
  });

  it('14 — 기존 Public에 신규 Word option 없음', () => {
    for (const id of ['stroop-arrow-bg-47', 'stroop-word-reverse-48', 'stroop-word-bg-49']) {
      const engine = findOfficialSpomovePreset(id)?.engine;
      expect(engine?.stroopWordResponse).toBeUndefined();
      expect(engine?.stroopWordRuleMode).toBeUndefined();
    }
    for (const level of [2, 3] as const) {
      const sig = generateSignal('stroop', level, COLORS);
      const content = sig?.content as WordContent;
      expect(content.stroopWordResponse).toBeUndefined();
      expect(content.stroopWordReverse).toBeUndefined();
      expect(content.stroopWordTask).toBeUndefined();
    }
  });

  it('Cue는 규칙만 알려 주고 정답 색 이름을 넣지 않는다', () => {
    expect(resolveStroopWordMovementCue({ stroopWordResponse: 'movement', stroopWordTask: 'meaning', stroopWordReverse: false })).toBe(
      STROOP_WORD_MOVE_TASK_CUE.meaning,
    );
    expect(resolveStroopWordMovementCue({ stroopWordResponse: 'movement', stroopWordTask: 'ink', stroopWordReverse: false })).toBe(
      STROOP_WORD_MOVE_TASK_CUE.ink,
    );
    expect(resolveStroopWordMovementCue({ stroopWordResponse: 'movement', stroopWordTask: 'meaning', stroopWordReverse: true })).toBe(
      STROOP_WORD_MOVE_TASK_CUE.meaningReverse,
    );
    expect(resolveStroopWordMovementCue({ stroopWordResponse: 'movement', stroopWordTask: 'ink', stroopWordReverse: true })).toBe(
      STROOP_WORD_MOVE_TASK_CUE.inkReverse,
    );
    expect(resolveStroopWordMovementCue({ stroopWordTask: 'meaning' })).toBeNull();
    for (const cue of Object.values(STROOP_WORD_MOVE_TASK_CUE)) {
      expect(cue).not.toMatch(/빨강|파랑|초록|노랑|가세요/);
    }
  });

  it('word meaning과 ink는 pair()로 항상 다른 색 (congruent 없음)', () => {
    for (let i = 0; i < 120; i++) {
      const sig = generateSignal('stroop', 2, COLORS, {
        stroopWordResponse: 'movement',
        stroopWordRuleMode: 'switch',
      });
      const content = sig?.content as WordContent;
      const wordColor = COLORS.find((c) => c.name === content.word);
      const inkColor = COLORS.find((c) => c.bg.toLowerCase() === String(content.textHex).toLowerCase());
      expect(wordColor?.id).toBeTruthy();
      expect(inkColor?.id).toBeTruthy();
      expect(wordColor?.id).not.toBe(inkColor?.id);
    }
  });

  it('movement 신호 집계 색은 resolver 타깃이다', () => {
    const meaning = {
      type: 'stroop',
      content: {
        word: '빨강',
        textHex: '#3B82F6',
        stroopWordTask: 'meaning',
        stroopWordReverse: false,
        stroopWordResponse: 'movement',
      },
    };
    const reverseInk = {
      type: 'stroop',
      content: {
        word: '빨강',
        textHex: '#3B82F6',
        stroopWordTask: 'ink',
        stroopWordReverse: true,
        stroopWordResponse: 'movement',
      },
    };
    expect(extractStimulusColorIds(meaning)).toEqual(['red']);
    expect(extractStimulusColorIds(reverseInk)).toEqual(['red']);
  });
});
