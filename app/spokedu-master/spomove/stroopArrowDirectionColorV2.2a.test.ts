import { describe, expect, it } from 'vitest';

import { COLORS } from '@/app/admin/spomove/training/_player/constants';
import {
  extractStimulusColorIds,
  generateSignal,
} from '@/app/admin/spomove/training/_player/lib/signals';
import {
  isStroopArrowCongruent,
  resolveStroopArrowMoveTarget,
  resolveStroopArrowMovementCue,
  STROOP_ARROW_MOVE_TASK_CUE,
} from '@/app/admin/spomove/training/_player/lib/resolveStroopArrowMoveTarget';
import { canLaunchInternalSpomoveCandidate } from './internalSpomoveCandidateAccess';
import { isHubListedPreset, isHubRunnablePreset } from './movements/isHubVisiblePreset';
import {
  findOfficialSpomovePreset,
  OFFICIAL_SPOMOVE_LIBRARY,
} from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

const CANDIDATE_ID = 'stroop-arrow-direction-color-v2';

function publicLibrary() {
  return OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
}

describe('SPOMOVE 2A stroop-arrow-direction-color-v2', () => {
  it('Test A — Public 72 유지, 신규 ID는 카탈로그에 없음', () => {
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).toHaveLength(72);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_ID);
    expect(publicLibrary()).toHaveLength(72);
    expect(publicLibrary().map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('Test B — stroop-arrow-reverse-08 engine 불변', () => {
    expect(findOfficialSpomovePreset('stroop-arrow-reverse-08')?.engine).toEqual({
      mode: 'basic',
      level: 1,
      spatialArrowColorMode: 'color',
      spatialArrowColorMapping: 'compass',
    });
  });

  it('Test C — reaction-cognition-space-direction-color-01b engine 불변', () => {
    expect(findOfficialSpomovePreset('reaction-cognition-space-direction-color-01b')?.engine).toEqual({
      mode: 'basic',
      level: 1,
      spatialArrowColorMode: 'color',
      spatialArrowColorMapping: 'compass',
    });
  });

  it('Test D — 신규 프리셋은 HOLD이며 Hub에 노출되지 않음', () => {
    const preset = findOfficialSpomovePreset(CANDIDATE_ID);
    expect(preset).toBeTruthy();
    expect(preset?.catalogStatus).toBe('hold');
    expect(preset?.engine).toEqual({ mode: 'stroop', level: 1, stroopArrowResponse: 'movement' });
    expect(isHubListedPreset(preset!)).toBe(false);
    expect(isHubRunnablePreset(preset!)).toBe(false);
    expect(getSpomovePadLayoutVariant(preset!)).toBe('compass');
    expect(preset?.internalCandidate).toBe(true);
    expect(canLaunchInternalSpomoveCandidate(preset, false)).toBe(false);
    expect(canLaunchInternalSpomoveCandidate(preset, undefined)).toBe(false);
    expect(canLaunchInternalSpomoveCandidate(preset, true)).toBe(true);
    expect(canLaunchInternalSpomoveCandidate(findOfficialSpomovePreset('stroop-missing-color-50'), false)).toBe(true);
    expect(canLaunchInternalSpomoveCandidate(findOfficialSpomovePreset('stroop-arrow-reverse-08'), false)).toBe(true);
  });

  it('Test E — 방향과 색이 독립이며 Congruent/Incongruent가 모두 발생', () => {
    let congruent = 0;
    let incongruent = 0;
    const arrows = new Set<string>();
    const fills = new Set<string>();
    for (let i = 0; i < 240; i++) {
      const sig = generateSignal('stroop', 1, COLORS, { stroopArrowResponse: 'movement' });
      expect(sig?.type).toBe('stroop_arrow');
      const content = sig?.content as {
        arrowId: string;
        fillHex: string;
        stroopArrowTask: string;
        stroopArrowReverse: boolean;
        stroopArrowResponse: string;
      };
      expect(content.stroopArrowResponse).toBe('movement');
      expect(content.stroopArrowReverse).toBe(false);
      arrows.add(content.arrowId);
      fills.add(content.fillHex);
      if (isStroopArrowCongruent(content)) congruent += 1;
      else incongruent += 1;
    }
    expect(arrows.size).toBeGreaterThan(1);
    expect(fills.size).toBeGreaterThan(1);
    expect(congruent).toBeGreaterThan(0);
    expect(incongruent).toBeGreaterThan(0);
  });

  it('Test F/G/H — COLOR·DIRECTION target 매핑', () => {
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillColorId: 'blue',
        stroopTask: 'color',
      }),
    ).toBe('blue');
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillHex: '#3B82F6',
        stroopTask: 'direction',
      }),
    ).toBe('red');
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'right',
        fillColorId: 'red',
        stroopTask: 'direction',
      }),
    ).toBe('yellow');
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'left',
        fillColorId: 'yellow',
        stroopTask: 'direction',
      }),
    ).toBe('green');
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'down',
        fillColorId: 'red',
        stroopTask: 'direction',
      }),
    ).toBe('blue');
  });

  it('invalid stroopTask / arrow / color → null', () => {
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillColorId: 'blue',
        stroopTask: undefined,
      }),
    ).toBeNull();
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillColorId: 'blue',
        stroopTask: '',
      }),
    ).toBeNull();
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillColorId: 'blue',
        stroopTask: 'garbage',
      }),
    ).toBeNull();
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'unknown',
        fillColorId: 'blue',
        stroopTask: 'direction',
      }),
    ).toBeNull();
    expect(
      resolveStroopArrowMoveTarget({
        arrowId: 'up',
        fillHex: '#NOT_A_COLOR',
        stroopTask: 'color',
      }),
    ).toBeNull();
  });

  it('invalid movement task는 Cue를 만들지 않는다', () => {
    expect(resolveStroopArrowMovementCue({ stroopArrowResponse: 'movement', stroopArrowTask: 'garbage' })).toBeNull();
    expect(resolveStroopArrowMovementCue({ stroopArrowResponse: 'movement', stroopArrowTask: '' })).toBeNull();
    expect(resolveStroopArrowMovementCue({ stroopArrowResponse: 'movement' })).toBeNull();
    expect(
      resolveStroopArrowMovementCue({ stroopArrowResponse: 'movement', stroopArrowTask: 'direction' }),
    ).toBe(STROOP_ARROW_MOVE_TASK_CUE.direction);
    expect(
      resolveStroopArrowMovementCue({ stroopArrowResponse: 'movement', stroopArrowTask: 'fill' }),
    ).toBe(STROOP_ARROW_MOVE_TASK_CUE.color);
    expect(resolveStroopArrowMovementCue({ stroopArrowTask: 'direction' })).toBeNull();
  });

  it('movement 신호의 TTS는 정답이 아니라 과제 차원 Cue다', () => {
    for (let i = 0; i < 40; i++) {
      const sig = generateSignal('stroop', 1, COLORS, { stroopArrowResponse: 'movement' });
      const content = sig?.content as { stroopArrowTask?: string };
      const expected =
        content.stroopArrowTask === 'direction'
          ? STROOP_ARROW_MOVE_TASK_CUE.direction
          : STROOP_ARROW_MOVE_TASK_CUE.color;
      expect(sig?.voice).toBe(expected);
      expect(sig?.voice).not.toMatch(/위|아래|왼쪽|오른쪽|빨강|파랑|초록|노랑/);
    }
  });

  it('COLOR/DIRECTION 신호의 집계 색은 이동 타깃이다', () => {
    const colorSig = {
      type: 'stroop_arrow',
      content: {
        arrowId: 'up',
        fillHex: '#3B82F6',
        stroopArrowTask: 'fill',
        stroopArrowResponse: 'movement',
      },
    };
    const dirSig = {
      type: 'stroop_arrow',
      content: {
        arrowId: 'up',
        fillHex: '#3B82F6',
        stroopArrowTask: 'direction',
        stroopArrowResponse: 'movement',
      },
    };
    expect(extractStimulusColorIds(colorSig)).toEqual(['blue']);
    expect(extractStimulusColorIds(dirSig)).toEqual(['red']);
  });

  it('Test I — 기존 stroop 단어 경로는 movement 옵션 없이 그대로 stroop 타입', () => {
    const word = generateSignal('stroop', 2, COLORS);
    const reverse = generateSignal('stroop', 3, COLORS);
    const bg = generateSignal('stroop', 4, COLORS, { stroopWordMode: 'bg' });
    expect(word?.type).toBe('stroop');
    expect(reverse?.type).toBe('stroop');
    expect(bg?.type).toBe('stroop');
    expect((word?.content as { stroopArrowResponse?: string } | undefined)?.stroopArrowResponse).toBeUndefined();
  });

  it('기존 stroop L1 음성 경로는 movement 플래그가 없다', () => {
    const sig = generateSignal('stroop', 1, COLORS);
    expect(sig?.type).toBe('stroop_arrow');
    expect((sig?.content as { stroopArrowResponse?: string }).stroopArrowResponse).toBeUndefined();
  });

  it('기존 Public stroop ID의 engine은 이번 후보 옵션을 갖지 않는다', () => {
    for (const id of ['stroop-arrow-bg-47', 'stroop-word-reverse-48', 'stroop-word-bg-49']) {
      expect(findOfficialSpomovePreset(id)?.engine.stroopArrowResponse).toBeUndefined();
    }
  });
});
