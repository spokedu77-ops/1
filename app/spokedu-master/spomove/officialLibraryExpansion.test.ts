import { describe, expect, it } from 'vitest';



import {

  OFFICIAL_SPOMOVE_CORE_COUNT,

  OFFICIAL_SPOMOVE_EXPANSION_COUNT,

  OFFICIAL_SPOMOVE_LIBRARY,

  OFFICIAL_SPOMOVE_LIBRARY_SIZE,

  findOfficialSpomovePreset,

  type OfficialFlowFeatureKey,

} from './officialSpomovePresets';
import {
  SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER,
  SPOMOVE_PUBLIC_CATALOG_ORDER,
  SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER,
} from './spomovePublicCatalogOrder';



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



  it('변형 사분할은 1~3단계이며 easy 고정이다', () => {
    const variantQuadrants = OFFICIAL_SPOMOVE_LIBRARY.filter(
      (preset) =>
        preset.engine.mode === 'basic' &&
        preset.engine.level >= 7 &&
        preset.engine.level <= 9 &&
        !preset.engine.handFootDifficulty,
    );
    expect(variantQuadrants).toHaveLength(3);
    for (const level of [7, 8, 9]) {
      const byLevel = variantQuadrants.filter((preset) => preset.engine.level === level);
      expect(byLevel).toHaveLength(1);
      expect(byLevel[0]?.engine.bodyLabelMode).toBe('easy');
      expect(byLevel[0]?.engine.hideBodyLabelModeControls).toBe(true);
      expect(byLevel[0]?.engine.variantColorTheme).toBe('color');
      expect(byLevel[0]?.cueSeconds).toBe(5);
    }
    expect(OFFICIAL_SPOMOVE_LIBRARY.some((p) => p.id.includes('mq4') || p.id.endsWith('-hard'))).toBe(false);
  });



  const activeLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');

  const byGroup = (group: string) => activeLibrary.filter((preset) => preset.programGroup === group);
  const allByGroup = (group: string) => OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.programGroup === group);

  it('keeps Simon titles ordered by normal/hard pairs', () => {
    expect(byGroup('simon').map((preset) => preset.title)).toEqual([
      '사이먼 이펙트 · 화살표 · 보통',
      '사이먼 이펙트 · 화살표 · 어려움',
      '사이먼 이펙트 · 도형 · 보통',
      '사이먼 이펙트 · 도형 · 어려움',
      '사이먼 이펙트 · 풍선 · 보통',
      '사이먼 이펙트 · 풍선 · 어려움',
      '사이먼 이펙트 · 랜덤 테마 · 보통',
      '사이먼 이펙트 · 랜덤 테마 · 어려움',
      '사이먼 이펙트 · 카모플라쥬 · 보통',
      '사이먼 이펙트 · 카모플라쥬 · 어려움',
    ]);
  });



  it('그룹별 개수가 확장 목표와 일치한다', () => {

    expect(activeLibrary).toHaveLength(72);

    expect(byGroup('reaction-cognition')).toHaveLength(23);

    expect(byGroup('visual-reaction')).toHaveLength(10);

    expect(byGroup('simon')).toHaveLength(10);

    expect(byGroup('flanker')).toHaveLength(17);

    expect(byGroup('stroop')).toHaveLength(4);

    expect(byGroup('sequential-memory')).toHaveLength(6);

    expect(byGroup('dive')).toHaveLength(2);

    expect(byGroup('bonus')).toHaveLength(0);

    const holdouts = OFFICIAL_SPOMOVE_LIBRARY.filter(
      (preset) =>
        preset.catalogStatus === 'hold' &&
        (
          (preset.engine.mode === 'basic' && (preset.engine.level === 5 || preset.engine.level === 6)) ||
          (preset.engine.mode === 'reactTrain' && preset.engine.level === 9)
        ),
    );
    expect(holdouts).toHaveLength(16);
    expect(activeLibrary.some((preset) => preset.engine.mode === 'basic' && preset.engine.level === 5)).toBe(false);
    expect(activeLibrary.some((preset) => preset.engine.mode === 'basic' && preset.engine.level === 6)).toBe(false);
    expect(activeLibrary.some((preset) => preset.engine.mode === 'reactTrain' && preset.engine.level === 9)).toBe(false);

  });

  it('공개 72개 preset ID 순서가 SPOMOVE_PUBLIC_CATALOG_ORDER와 일치한다', () => {
    expect(activeLibrary.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);

    for (const group of SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER) {
      expect(byGroup(group).map((preset) => preset.id)).toEqual([
        ...SPOMOVE_PUBLIC_CATALOG_ORDER[group],
      ]);
    }
  });



  it('DIVE 공식 프리셋 3종 — 기본·랜덤·Color Gate', () => {

    const dive = allByGroup('dive');

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



  it('반응 인지 L2~L6 테마 조합이 fruit/animal/color/food/nature/vehicle/mix 7종을 모두 포함한다', () => {

    const themed = byGroup('reaction-cognition').filter(

      (preset) => preset.engine.mode === 'basic' && preset.engine.level >= 2 && preset.engine.level <= 4,

    );

    expect(themed).toHaveLength(21);

    for (const level of [2, 3, 4]) {

      const levelPresets = themed.filter((preset) => preset.engine.level === level);

      expect(levelPresets).toHaveLength(7);

    }

    expect(themed.some((preset) => preset.engine.variantColorTheme === 'emotion')).toBe(false);
    for (const level of [2, 3, 4]) {
      const themes = themed
        .filter((preset) => preset.engine.level === level)
        .map((preset) => preset.engine.variantColorTheme);
      expect(themes).toEqual(expect.arrayContaining(['fruit', 'animal', 'color', 'food', 'nature', 'vehicle', 'mix']));
    }

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

  it('시지각 반응 FLOW concurrent 2만 카탈로그에 둔다', () => {
    const flow = vr.filter((preset) => preset.engine.level === 2 && preset.engine.mode === 'reactTrain');
    expect(flow).toHaveLength(1);
    expect(flow[0]?.engine.reactTrainConcurrent).toBe(2);
    expect(findOfficialSpomovePreset('visual-reaction-flow-05')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-flow-3x-32')).toBeNull();
  });

  it('숫자 연산 기차·두더지·골키퍼는 노출하고 흰 공은 SPOKEDU MASTER 카탈로그에서 제외한다', () => {
    expect(vr.filter((preset) => preset.engine.level === 8 && preset.engine.mode === 'reactTrain')).toHaveLength(0);
    expect(vr.filter((preset) => preset.engine.level === 9 && preset.engine.mode === 'reactTrain')).toHaveLength(0);
    expect(vr.filter((preset) => preset.engine.level === 10 && preset.engine.mode === 'reactTrain')).toHaveLength(2);
    expect(vr.filter((preset) => preset.engine.level === 6 && preset.engine.mode === 'reactTrain')).toHaveLength(2);
    expect(vr.filter((preset) => preset.engine.level === 5 && preset.engine.mode === 'reactTrain')).toHaveLength(0);
    expect(vr.filter((preset) => preset.engine.level === 4 && preset.engine.mode === 'reactTrain')).toHaveLength(0);
    expect(vr.filter((preset) => preset.engine.level === 7 && preset.engine.mode === 'reactTrain')).toHaveLength(0);
    expect(vr.filter((preset) => preset.engine.level === 7 && preset.engine.mode === 'basic')).toHaveLength(3);
    expect(
      vr
        .filter((preset) => preset.engine.handFootDifficulty)
        .map((preset) => preset.engine.handFootDifficulty)
        .sort(),
    ).toEqual(['easy', 'hard', 'normal']);

    expect(findOfficialSpomovePreset('visual-reaction-number-cart-l2')?.engine.numberCartTier).toBe(1);
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-l2')?.catalogStatus).toBe('hold');
    expect(findOfficialSpomovePreset('visual-reaction-white-ball-hard-skeleton')?.catalogStatus).toBe('hold');
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-l2')?.engine.colorTrackerTier).toBe(1);
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-l2')?.engine.colorTrackerDualPanel).toBe(false);
    expect(findOfficialSpomovePreset('visual-reaction-goalkeeper-42')?.engine.level).toBe(10);
    expect(findOfficialSpomovePreset('visual-reaction-mole-l1')?.engine.moleLookMode).toBe('classic');

    const magic = findOfficialSpomovePreset('visual-reaction-blackout-37');
    expect(magic?.programGroup).toBe('simon');
    expect(magic?.engine).toEqual({ mode: 'simon', level: 4, camouflagePlacement: 'variant' });

    expect(findOfficialSpomovePreset('visual-reaction-mole-l2')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-camouflage-l2')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-number-cart-tier1-exp')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-color-tracker-tier3-exp')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-pulse-36')).toBeNull();
    expect(findOfficialSpomovePreset('visual-reaction-wormhole-41')).toBeNull();

    expect(vr.some((preset) => preset.id === 'visual-reaction-sweep-38')).toBe(false);
  });

  it('시지각 반응 카탈로그는 흰 공 찾기를 제외하고 10개를 노출한다', () => {
    expect(vr).toHaveLength(10);
    expect(vr.map((p) => p.engine.level).sort((a, b) => a - b)).toEqual([1, 2, 3, 6, 6, 7, 7, 7, 10, 10]);
  });

  it('사이먼 그룹에 카모플라쥬(level 5)·풍선(level 3)이 포함된다', () => {
    const simon = byGroup('simon');
    expect(simon.some((preset) => preset.id === 'visual-reaction-blackout-37')).toBe(true);
    expect(simon.some((preset) => preset.engine.level === 5 && preset.engine.mode === 'simon')).toBe(true);
    expect(simon.some((preset) => preset.id === 'simon-balloon-flash-05')).toBe(true);
    expect(simon.some((preset) => preset.engine.level === 3 && preset.engine.mode === 'simon')).toBe(true);
  });



  it('플랭커를 화살표 2 + 랜덤 자극 7 + 극단 8로 공개한다', () => {
    const flanker = byGroup('flanker');
    expect(flanker).toHaveLength(17);
    expect(flanker.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_ORDER.flanker]);
    expect(flanker.filter((preset) => preset.title.startsWith('화살표 ·'))).toHaveLength(2);
    expect(flanker.filter((preset) => preset.title.startsWith('랜덤 자극 ·'))).toHaveLength(7);
    expect(flanker.filter((preset) => preset.title.startsWith('극단 ·'))).toHaveLength(8);
    expect(flanker.slice(2, 9).map((preset) => preset.title)).toEqual([
      '랜덤 자극 · 색상',
      '랜덤 자극 · 과일',
      '랜덤 자극 · 동물',
      '랜덤 자극 · 음식',
      '랜덤 자극 · 자연',
      '랜덤 자극 · 탈 것',
      '랜덤 자극 · 믹스',
    ]);
    expect(flanker.slice(9).map((preset) => preset.title)).toEqual([
      '극단 · 색상',
      '극단 · 과일',
      '극단 · 동물',
      '극단 · 음식',
      '극단 · 자연',
      '극단 · 탈 것',
      '극단 · 믹스',
      '극단 · 화살표 · 어려움',
    ]);
    expect(flanker.some((preset) => preset.title.includes('원 속의 원'))).toBe(false);
    expect(flanker.some((preset) => preset.title === '극단')).toBe(false);
    expect(flanker.filter((preset) => preset.engine.flankerStimulusType === 'number')).toHaveLength(0);
    expect(flanker.filter((preset) => preset.engine.level === 3 && preset.engine.flankerExtremeMode === 'theme')).toHaveLength(7);
    expect(flanker.filter((preset) => preset.engine.level === 3 && preset.engine.flankerExtremeMode === 'arrow')).toHaveLength(1);
  });

  it('스트룹 4개 공식 제목과 순서를 유지한다', () => {
    expect(byGroup('stroop').map((preset) => preset.title)).toEqual([
      '색상화살표 · 보통 (기본)',
      '단어 · 보통 (의미/잉크 전환)',
      '단어 · 보통+ (의미/잉크·역전)',
      '단어 · 어려움 (배경간섭 추가)',
    ]);
  });

  it('순차 기억 6개 공식 제목과 순서를 유지한다', () => {
    expect(byGroup('sequential-memory').map((preset) => preset.title)).toEqual([
      '순서 기억 · 쉬움 (3개)',
      '순서 기억 · 보통 (5개)',
      '순서 기억 · 쉬움 → 보통 → 어려움 (3~7개)',
      '순서 기억 · 어려움 (커스텀)',
      '랜덤 기억 · 어려움 (퀴즈)',
      '전체 공개 · 어려움',
    ]);
  });

  it('사이먼 10개는 모든 보통/어려움 쌍을 제목에 표시한다', () => {
    const titles = byGroup('simon').map((preset) => preset.title);
    for (const family of ['화살표', '도형', '풍선', '랜덤 테마', '카모플라쥬']) {
      expect(titles.some((title) => title.includes(`${family} · 보통`))).toBe(true);
      expect(titles.some((title) => title.includes(`${family} · 어려움`))).toBe(true);
    }
  });



  it('DIVE 기본 프리셋에 punch/kick/duck/reach가 모두 포함된다', () => {

    const standard = findOfficialSpomovePreset('dive-standard');

    expect(standard?.engine.flowFeatures).toEqual(['punch', 'kick', 'duck', 'reach']);

  });



  it('기존 legacy ID 유지(제거된 FLOW×1 제외)', () => {

    const legacyIds = [

      'reaction-cognition-space-direction-01',

      'reaction-cognition-quad-color-02',

      'reaction-cognition-full-color-03',

      'reaction-cognition-split-color-04',

      'simon-pole-shape-06',

      'flanker-uniform-07',

      'stroop-arrow-reverse-08',

      'sequential-memory-3color-09',

    ];

    for (const id of legacyIds) {

      expect(findOfficialSpomovePreset(id)).not.toBeNull();

    }

    expect(findOfficialSpomovePreset('visual-reaction-flow-05')).toBeNull();

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


