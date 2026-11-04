import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import {
  buildSpomovePresetSearchHaystack,
  composeSpomovePublicCardMetaParts,
  getSpomoveCardDisplayModel,
  getSpomovePresetDisplayModel,
  resolveSpomovePublicCardDifficulty,
} from './spomovePresetDisplayModel';
import {
  SPOMOVE_PUBLIC_NAMING_BY_ID,
  getSpomovePublicNaming,
  resolveSpomovePublicDisplayTitle,
} from './spomovePublicNaming';

const publicLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
const DIFFICULTY_SLOT = /^난이도 (쉬움|보통|어려움)$/u;
const BARE_DIFFICULTY = /^(쉬움|보통|어려움)$/u;
const DIFFICULTY_WORD = /쉬움|보통|어려움/u;
const RESPONSE_TYPE_LEAK = /단순 반응|선택 반응|보고 바로 반응|골라서 반응/;
const TRAINING_FOCUS_LEAK = /간섭 억제|상하지 협응|시각 탐색|위치 간섭 조절|혼합 자극 처리|방향 변별|시간 조절|난이도 조절/;

function findPublic(id: string) {
  const preset = publicLibrary.find((item) => item.id === id);
  expect(preset, id).toBeTruthy();
  return preset!;
}

function matchesQuery(presetId: string, query: string) {
  const preset = findPublic(presetId);
  return buildSpomovePresetSearchHaystack(preset)
    .toLocaleLowerCase('ko-KR')
    .includes(query.toLocaleLowerCase('ko-KR'));
}

function expectedLine(presetId: string, core: string, variant?: string) {
  const difficulty = resolveSpomovePublicCardDifficulty(findPublic(presetId));
  return composeSpomovePublicCardMetaParts({
    core,
    ...(variant ? { variant } : {}),
    difficulty,
  }).join(' · ');
}

describe('SPOMOVE public naming apply', () => {
  it('covers public 72 with no missing or extra map entries', () => {
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).toHaveLength(72);
    expect(publicLibrary.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);

    const mapIds = Object.keys(SPOMOVE_PUBLIC_NAMING_BY_ID);
    const publicIds = [...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER];
    const missing = publicIds.filter((id) => !SPOMOVE_PUBLIC_NAMING_BY_ID[id]);
    const extra = mapIds.filter((id) => !publicIds.includes(id));

    expect(mapIds).toHaveLength(72);
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('keeps every public title applied', () => {
    const statuses = publicLibrary.map((preset) => getSpomovePublicNaming(preset.id)?.status);
    expect(statuses.filter((status) => status === 'applied')).toHaveLength(72);
    expect(statuses.filter((status) => status === 'runtime-deferred')).toHaveLength(0);
    expect(statuses.filter((status) => status === 'name-hold')).toHaveLength(0);
    expect(statuses).toHaveLength(72);
  });

  it('uses the explicit cardTitle without composing the metadata variant into it', () => {
    const fruit = getSpomovePresetDisplayModel(findPublic('reaction-cognition-quad-fruit-10'));
    expect(fruit.rootTitle).toBe('네 칸 과일 색 따라가기');
    expect(fruit.variantLabel).toBe('과일');
    expect(fruit.displayTitle).toBe('네 칸 과일 색 따라가기');

    const handFoot = getSpomovePresetDisplayModel(findPublic('visual-reaction-hand-foot-hard-skeleton'));
    expect(handFoot.rootTitle).toBe('손발 동시 움직이기');
    expect(handFoot.variantLabel).toBe('');

    const flanker = getSpomovePresetDisplayModel(findPublic('flanker-theme-animal-skeleton'));
    expect(flanker.rootTitle).toBe('가운데 동물 색 따라가기');
    expect(flanker.variantLabel).toBe('동물');

    const sequence = getSpomovePresetDisplayModel(findPublic('sequential-memory-5color-51'));
    expect(sequence.rootTitle).toBe('다섯 가지 색 순서 기억하기');
    expect(sequence.variantLabel).toBe('5개');

    const dive = getSpomovePresetDisplayModel(findPublic('dive-standard'));
    expect(dive.rootTitle).toBe('액션 무브');
    expect(dive.variantLabel).toBe('');
    expect(dive.displayTitle).toBe('액션 무브');
  });

  it('does not show invented variants on cards without official variant', () => {
    for (const id of ['visual-reaction-flash-33', 'visual-reaction-rush-39', 'visual-reaction-flow-2x-31', 'dive-standard', 'dive-color-gate-61']) {
      const card = getSpomoveCardDisplayModel(findPublic(id));
      expect(card.variantLabel).toBe('');
      expect(card.publicMeta.variant).toBeUndefined();
    }
  });

  it('resolves applied session snapshots to their public titles', () => {
    expect(resolveSpomovePublicDisplayTitle('reaction-cognition-quad-fruit-10', '4분할 자극 · 과일')).toBe('네 칸 과일 색 따라가기');
    expect(resolveSpomovePublicDisplayTitle('stroop-arrow-reverse-08', '스트룹 이펙트 1번 · 화살표 반대')).toBe('화살표 방향 말고 색으로 점프');
    expect(resolveSpomovePublicDisplayTitle('sequential-memory-full-reveal-54', '순간 기억 3X3 그리드 (원샷)')).toBe('한눈에 색 배치 기억하기 (3X3)');
  });

  it('lets official applied naming beat CMS displayTitle override', () => {
    const model = getSpomovePresetDisplayModel(findPublic('reaction-cognition-quad-fruit-10'), {
      displayTitle: '4분할 자극 · 과일',
      variantLabel: 'CMS variant',
    });
    expect(model.rootTitle).toBe('네 칸 과일 색 따라가기');
    expect(model.variantLabel).toBe('과일');
    expect(model.displayTitle).toBe('네 칸 과일 색 따라가기');
    expect(
      getSpomoveCardDisplayModel(findPublic('reaction-cognition-quad-fruit-10'), {
        variantLabel: 'CMS variant',
      }).publicMeta.variant,
    ).toBe('과일');
  });

  it('lets applied public titles beat CMS displayTitle overrides', () => {
    const camouflage = getSpomovePresetDisplayModel(findPublic('simon-camouflage-center-skeleton'), {
      displayTitle: 'CMS camouflage title',
    });
    expect(camouflage.displayTitle).toBe('숨은 색 찾아가기 (1개)');
    expect(camouflage.rootTitle).toBe('숨은 색 찾아가기 (1개)');

    const applied = getSpomovePresetDisplayModel(findPublic('sequential-memory-full-reveal-54'), {
      displayTitle: 'CMS override title',
    });
    expect(applied.displayTitle).toBe('한눈에 색 배치 기억하기 (3X3)');
  });

  it('searches v2 card titles and legacy preset titles', () => {
    expect(matchesQuery('reaction-cognition-quad-fruit-10', '네 칸 과일 색 따라가기')).toBe(true);
    expect(matchesQuery('reaction-cognition-quad-fruit-10', '4분할')).toBe(true);
    expect(matchesQuery('simon-camouflage-center-skeleton', '카모플라쥬')).toBe(true);
    expect(matchesQuery('simon-camouflage-center-skeleton', '숨은 색 찾아가기 (1개)')).toBe(true);
    expect(matchesQuery('stroop-arrow-reverse-08', '화살표 방향 말고 색으로 점프')).toBe(true);
  });

  it('keeps favorites card title difficulty-free and aria on displayTitle', () => {
    const source = readFileSync(join(process.cwd(), 'app/spokedu-master/favorites/FavoritesView.tsx'), 'utf8');
    expect(source).toContain('title: card.title');
    expect(source).toContain('accessTitle: model.displayTitle');
    expect(source).toContain('primaryMeta: card.publicMeta.core');
    expect(source).toContain('secondaryMeta: card.publicMeta.difficulty');
    expect(source).not.toContain('resolveSpomovePublicCardSupport');
  });

  it('does not put SPOMAT movement copy on color-number public naming', () => {
    const model = getSpomovePresetDisplayModel(findPublic('sequential-memory-color-number-exp'));
    expect(model.rootTitle).toBe('색깔과 번호 기억하기');
    expect(model.variantLabel).toBe('퀴즈');
    expect(model.displayTitle).not.toMatch(/SPOMAT|이동/u);
  });
});
describe('SPOMOVE public card meta contract', () => {
  it('covers core and difficulty for all public 72 cards', () => {
    let bareDifficulty = 0;
    let difficultyInVariant = 0;
    let doubledDifficulty = 0;
    let responseLeak = 0;
    let focusLeak = 0;

    for (const preset of publicLibrary) {
      const naming = getSpomovePublicNaming(preset.id);
      expect(naming?.cardCore.trim().length, preset.id).toBeGreaterThan(0);
      const card = getSpomoveCardDisplayModel(preset);
      const parts = composeSpomovePublicCardMetaParts(card.publicMeta);
      expect(card.publicMeta.core).toBe(naming!.cardCore);
      expect(card.publicMeta.difficulty).toMatch(DIFFICULTY_SLOT);
      expect(card.publicMeta.difficulty).toBe(resolveSpomovePublicCardDifficulty(preset));
      expect(parts[0]).toBe(card.publicMeta.core);
      expect(parts.at(-1)).toBe(card.publicMeta.difficulty);
      if (card.publicMeta.variant) {
        expect(parts).toEqual([card.publicMeta.core, card.publicMeta.variant, card.publicMeta.difficulty]);
      } else {
        expect(parts).toEqual([card.publicMeta.core, card.publicMeta.difficulty]);
      }
      const line = parts.join(' · ');
      if (line.includes('난이도 난이도')) doubledDifficulty += 1;
      if (DIFFICULTY_WORD.test(card.publicMeta.variant ?? '')) difficultyInVariant += 1;
      if (naming?.status === 'applied' && DIFFICULTY_WORD.test(naming.variant ?? '')) difficultyInVariant += 1;
      for (const part of parts) {
        if (BARE_DIFFICULTY.test(part)) bareDifficulty += 1;
      }
      if (RESPONSE_TYPE_LEAK.test(line)) responseLeak += 1;
      if (TRAINING_FOCUS_LEAK.test(line)) focusLeak += 1;
    }

    expect(bareDifficulty).toBe(0);
    expect(difficultyInVariant).toBe(0);
    expect(doubledDifficulty).toBe(0);
    expect(responseLeak).toBe(0);
    expect(focusLeak).toBe(0);
  });

  it('matches representative public card metadata lines', () => {
    const line = (id: string) =>
      composeSpomovePublicCardMetaParts(getSpomoveCardDisplayModel(findPublic(id)).publicMeta).join(' · ');

    expect(line('reaction-cognition-space-direction-01')).toBe(
      expectedLine('reaction-cognition-space-direction-01', '방향 반응', '화살표'),
    );
    expect(line('reaction-cognition-quad-color-02')).toBe(expectedLine('reaction-cognition-quad-color-02', '4분할', '색상'));
    expect(line('reaction-cognition-quad-fruit-10')).toBe(expectedLine('reaction-cognition-quad-fruit-10', '4분할', '과일'));
    expect(line('reaction-cognition-full-animal-18')).toBe(expectedLine('reaction-cognition-full-animal-18', '전면', '동물'));
    expect(line('reaction-cognition-l4-food-exp')).toBe(expectedLine('reaction-cognition-l4-food-exp', '2분할', '음식'));
    expect(line('simon-pole-arrows-41')).toBe(expectedLine('simon-pole-arrows-41', '사이먼 이펙트'));
    expect(line('simon-arrow-hard-skeleton')).toBe(expectedLine('simon-arrow-hard-skeleton', '사이먼 이펙트'));
    expect(line('flanker-uniform-07')).toBe(expectedLine('flanker-uniform-07', '플랭커 이펙트', '좌우'));
    expect(line('flanker-arrow-udlr-exp')).toBe(expectedLine('flanker-arrow-udlr-exp', '플랭커 이펙트', '상하좌우'));
    expect(line('flanker-theme-animal-skeleton')).toBe(
      expectedLine('flanker-theme-animal-skeleton', '플랭커 이펙트', '동물'),
    );
    expect(line('stroop-word-bg-49')).toBe(expectedLine('stroop-word-bg-49', '스트룹 이펙트'));
    expect(line('sequential-memory-5color-51')).toBe(expectedLine('sequential-memory-5color-51', '순서 기억', '5개'));
    expect(line('sequential-memory-custom-10color-exp')).toBe(
      expectedLine('sequential-memory-custom-10color-exp', '순간 기억', '4×4'),
    );
    expect(line('sequential-memory-color-number-exp')).toBe(
      expectedLine('sequential-memory-color-number-exp', '연합 기억', '퀴즈'),
    );
    expect(line('dive-standard')).toBe(expectedLine('dive-standard', 'DIVE'));
  });

  it('uses public preset difficulty instead of thinkingLevel', () => {
    const source = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/spomovePublicCardDifficulty.ts'), 'utf8');
    expect(source).not.toContain('thinkingLevel');
    expect(source).not.toContain('SPOMOVE_THINKING_LEVEL_LABELS');
    expect(source).not.toContain('getOfficialSpomovePresetGuide');

    const moleLine = (id: string) =>
      composeSpomovePublicCardMetaParts(getSpomoveCardDisplayModel(findPublic(id)).publicMeta).join(' · ');
    expect(moleLine('visual-reaction-mole-l1')).toBe('시각 반응 · 난이도 쉬움');
    expect(moleLine('visual-reaction-mole-normal-skeleton')).toBe('시각 반응 · 난이도 보통');
    expect(moleLine('visual-reaction-goalkeeper-easy-skeleton')).toBe('시각 반응 · 난이도 쉬움');
    expect(moleLine('visual-reaction-goalkeeper-42')).toBe('시각 반응 · 난이도 보통');
    expect(moleLine('simon-pole-arrows-41')).toBe('사이먼 이펙트 · 난이도 보통');
    expect(moleLine('simon-arrow-hard-skeleton')).toBe('사이먼 이펙트 · 난이도 어려움');
    expect(moleLine('flanker-uniform-07')).toBe('플랭커 이펙트 · 좌우 · 난이도 보통');
    expect(moleLine('flanker-arrow-udlr-exp')).toBe('플랭커 이펙트 · 상하좌우 · 난이도 어려움');
    expect(moleLine('reaction-cognition-quad-fruit-10')).toBe('4분할 · 과일 · 난이도 쉬움');
  });

  it('keeps v2 simon pair titles and difficulty slots distinct', () => {
    const pairs = [
      ['simon-pole-arrows-41', 'simon-arrow-hard-skeleton'],
      ['simon-pole-shape-06', 'simon-shape-hard-skeleton'],
      ['simon-balloon-flash-05', 'simon-balloon-hard-skeleton'],
      ['simon-mixed-gallery-exp', 'simon-random-hard-skeleton'],
    ] as const;
    for (const [normalId, hardId] of pairs) {
      const normal = getSpomoveCardDisplayModel(findPublic(normalId));
      const hard = getSpomoveCardDisplayModel(findPublic(hardId));
      expect(normal.title).not.toBe(hard.title);
      expect(normal.publicMeta.core).toBe(hard.publicMeta.core);
      expect(normal.publicMeta.variant).toBe(hard.publicMeta.variant);
      expect(normal.publicMeta.difficulty).toBe('난이도 보통');
      expect(hard.publicMeta.difficulty).toBe('난이도 어려움');
    }
  });

  it('shows mole and goalkeeper difficulty in both title and metadata', () => {
    const pairs = [
      ['visual-reaction-mole-l1', 'visual-reaction-mole-normal-skeleton'],
      ['visual-reaction-goalkeeper-easy-skeleton', 'visual-reaction-goalkeeper-42'],
    ] as const;
    for (const [easyId, normalId] of pairs) {
      const easy = getSpomoveCardDisplayModel(findPublic(easyId));
      const normal = getSpomoveCardDisplayModel(findPublic(normalId));
      expect(easy.title).not.toBe(normal.title);
      expect(easy.title).toContain('(쉬움)');
      expect(normal.title).toContain('(보통)');
      expect(easy.publicMeta.difficulty).toBe('난이도 쉬움');
      expect(normal.publicMeta.difficulty).toBe('난이도 보통');
    }
  });

  it('reports no unexplained identical public cards', () => {
    const bySignature = new Map<string, string[]>();
    for (const preset of publicLibrary) {
      const display = getSpomovePresetDisplayModel(preset);
      const card = getSpomoveCardDisplayModel(preset);
      const signature = [
        display.rootTitle,
        card.publicMeta.core,
        card.publicMeta.variant ?? '',
        card.publicMeta.difficulty,
      ].join('|');
      const list = bySignature.get(signature) ?? [];
      list.push(preset.id);
      bySignature.set(signature, list);
    }
    const collisions = [...bySignature.values()].filter((ids) => ids.length > 1);
    expect(collisions).toEqual([]);
  });
});
