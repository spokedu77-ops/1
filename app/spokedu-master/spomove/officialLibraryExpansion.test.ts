import { describe, expect, it } from 'vitest';



import {

  OFFICIAL_SPOMOVE_CORE_COUNT,

  OFFICIAL_SPOMOVE_EXPANSION_COUNT,

  OFFICIAL_SPOMOVE_LIBRARY,

  OFFICIAL_SPOMOVE_LIBRARY_SIZE,

  findOfficialSpomovePreset,

  type OfficialFlowFeatureKey,

} from './officialSpomovePresets';



describe(`OFFICIAL_SPOMOVE_LIBRARY ${OFFICIAL_SPOMOVE_LIBRARY_SIZE}개 확장 계약`, () => {

  it(`OFFICIAL_SPOMOVE_LIBRARY.length === ${OFFICIAL_SPOMOVE_LIBRARY_SIZE}`, () => {

    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY_SIZE);

    expect(OFFICIAL_SPOMOVE_CORE_COUNT + OFFICIAL_SPOMOVE_EXPANSION_COUNT).toBe(OFFICIAL_SPOMOVE_LIBRARY_SIZE);

  });



  it('ID가 모두 고유하다', () => {

    const ids = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id);

    expect(new Set(ids).size).toBe(OFFICIAL_SPOMOVE_LIBRARY_SIZE);

  });



  it('sortOrder가 1부터 연속이다', () => {

    const orders = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.sortOrder).sort((a, b) => a - b);

    expect(orders).toEqual(Array.from({ length: OFFICIAL_SPOMOVE_LIBRARY_SIZE }, (_, index) => index + 1));

  });



  it('모든 preset isReady === true', () => {

    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.isReady)).toBe(true);

  });



  it('변형 사분할은 1~4단계가 easy/hard로 분리된다', () => {

    const variantQuadrants = OFFICIAL_SPOMOVE_LIBRARY.filter(

      (preset) => preset.engine.mode === 'basic' && preset.engine.level >= 7 && preset.engine.level <= 10,

    );

    expect(variantQuadrants).toHaveLength(8);

    for (const level of [7, 8, 9, 10]) {

      const byLevel = variantQuadrants.filter((preset) => preset.engine.level === level);

      expect(byLevel.map((preset) => preset.engine.bodyLabelMode).sort()).toEqual(['easy', 'hard']);

      expect(byLevel.every((preset) => preset.engine.hideBodyLabelModeControls)).toBe(true);

      expect(byLevel.every((preset) => preset.engine.variantColorTheme === 'color')).toBe(true);

      expect(byLevel.find((preset) => preset.engine.bodyLabelMode === 'easy')?.cueSeconds).toBe(5);

      expect(byLevel.find((preset) => preset.engine.bodyLabelMode === 'hard')?.cueSeconds).toBe(6);

    }

  });



  const byGroup = (group: string) => OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.programGroup === group);



  it('그룹별 개수가 확장 목표와 일치한다', () => {

    expect(byGroup('reaction-cognition')).toHaveLength(40);

    expect(byGroup('visual-reaction')).toHaveLength(17);

    expect(byGroup('simon')).toHaveLength(3);

    expect(byGroup('flanker')).toHaveLength(8);

    expect(byGroup('stroop')).toHaveLength(5);

    expect(byGroup('sequential-memory')).toHaveLength(6);

    expect(byGroup('dive')).toHaveLength(3);

    expect(byGroup('bonus')).toHaveLength(0);

  });



  it('DIVE 공식 프리셋 3종 — 기본·랜덤·Color Gate', () => {

    const dive = byGroup('dive');

    expect(dive.map((p) => p.id).sort()).toEqual([

      'dive-color-gate-61',

      'dive-random',

      'dive-standard',

    ]);



    const standard = findOfficialSpomovePreset('dive-standard');

    expect(standard?.engine.flowFeatures).toEqual(['punch', 'kick', 'duck', 'reach']);

    expect(standard?.engine.flowDuration).toBe(20);

    expect(standard?.engine.flowLayout).toBe('sequential');

    expect(standard?.engine.flowIncludeBonus).toBe(false);



    const random = findOfficialSpomovePreset('dive-random');

    expect(random?.engine.flowLayout).toBe('random');

    expect(random?.engine.flowDuration).toBe(60);



    const colorGate = findOfficialSpomovePreset('dive-color-gate-61');

    expect(colorGate?.engine.level).toBe(2);

    expect(colorGate?.engine.flowFeatures).toEqual(['colorGate']);

    expect(colorGate?.engine.flowDuration).toBe(60);

  });



  it('반응 인지 L2~L6 테마 조합이 color/fruit/vehicle/animal/nature/food 6종을 모두 포함한다', () => {

    const themed = byGroup('reaction-cognition').filter(

      (preset) => preset.engine.mode === 'basic' && preset.engine.level >= 2 && preset.engine.level <= 6,

    );

    expect(themed).toHaveLength(30);

    for (const level of [2, 3, 4, 5, 6]) {

      const levelPresets = themed.filter((preset) => preset.engine.level === level);

      expect(levelPresets).toHaveLength(6);

    }

    expect(themed.some((preset) => preset.engine.variantColorTheme === 'emotion')).toBe(false);

  });



  it('reaction cognition 1 color mode uses compass color mapping', () => {

    const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-color-01b');

    expect(preset?.engine).toMatchObject({

      mode: 'basic',

      level: 1,

      spatialArrowColorMode: 'color',

      spatialArrowColorMapping: 'compass',

    });

  });



  const vr = byGroup('visual-reaction');

  it('시지각 반응 FLOW concurrent 1/2/3 존재', () => {

    expect(vr.some((preset) => preset.engine.level === 1 && (preset.engine.reactTrainConcurrent ?? 1) === 1)).toBe(true);

    expect(vr.some((preset) => preset.engine.level === 1 && preset.engine.reactTrainConcurrent === 2)).toBe(true);

    expect(vr.some((preset) => preset.engine.level === 1 && preset.engine.reactTrainConcurrent === 3)).toBe(true);

  });



  it('숫자 기차·흰 공·두더지·매직 아이는 기본 1개만 카탈로그에 두고 난이도는 세션에서 고른다', () => {
    expect(vr.filter((preset) => preset.engine.level === 9 && preset.engine.mode === 'reactTrain')).toHaveLength(1);
    expect(vr.filter((preset) => preset.engine.level === 10 && preset.engine.mode === 'reactTrain')).toHaveLength(1);
    expect(vr.filter((preset) => preset.engine.level === 7 && preset.engine.mode === 'reactTrain')).toHaveLength(1);
    expect(vr.filter((preset) => preset.engine.level === 4 && preset.engine.mode === 'reactTrain')).toHaveLength(1);

    expect(findOfficialSpomovePreset('visual-reaction-number-cart-l2')?.engine.numberCartTier).toBe(1);
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-l2')?.engine.colorTrackerTier).toBe(1);
    expect(findOfficialSpomovePreset('visual-reaction-mole-l1')?.engine.moleLookMode).toBe('classic');
    expect(findOfficialSpomovePreset('visual-reaction-blackout-37')?.engine.camouflagePlacement).toBe('center');

    expect(findOfficialSpomovePreset('visual-reaction-mole-l2')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-camouflage-l2')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-number-cart-tier1-exp')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-tier3-exp')).toBeNull();

    expect(vr.some((preset) => preset.id === 'visual-reaction-sweep-38')).toBe(false);
  });



  it('플랭커 색 4종 + 숫자 4종', () => {

    const flanker = byGroup('flanker');

    expect(flanker.filter((preset) => preset.engine.flankerStimulusType === 'number')).toHaveLength(4);

    expect(flanker.filter((preset) => !preset.engine.flankerStimulusType || preset.engine.flankerStimulusType === 'color')).toHaveLength(4);

    expect(flanker.some((preset) => preset.id === 'flanker-grouped-42')).toBe(false);

    expect(flanker.some((preset) => preset.id === 'flanker-3circle-exp')).toBe(false);

  });



  it('DIVE 기본 프리셋에 punch/kick/duck/reach가 모두 포함된다', () => {

    const standard = findOfficialSpomovePreset('dive-standard');

    expect(standard?.engine.flowFeatures).toEqual(['punch', 'kick', 'duck', 'reach']);

  });



  it('기존 9개 legacy ID 유지', () => {

    const legacyIds = [

      'reaction-cognition-space-direction-01',

      'reaction-cognition-quad-color-02',

      'reaction-cognition-full-color-03',

      'reaction-cognition-split-color-04',

      'visual-reaction-flow-05',

      'simon-pole-shape-06',

      'flanker-uniform-07',

      'stroop-arrow-reverse-08',

      'sequential-memory-3color-09',

    ];

    for (const id of legacyIds) {

      expect(findOfficialSpomovePreset(id)).not.toBeNull();

    }

  });



  it('rock 포함 프리셋 0개', () => {

    expect(

      OFFICIAL_SPOMOVE_LIBRARY.filter((preset) =>

        (preset.engine.flowFeatures ?? []).includes('rock' as OfficialFlowFeatureKey),

      ),

    ).toHaveLength(0);

  });



  it('모든 preset에 executionFacts·settingChips·title·description 존재', () => {

    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.executionFacts.length > 0)).toBe(true);

    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.settingChips.length > 0)).toBe(true);

    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.title.trim().length > 0)).toBe(true);

    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.description.trim().length > 0)).toBe(true);

  });

});


