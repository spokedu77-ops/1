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

  it('keeps applied / runtime-deferred / name-hold counts', () => {
    const statuses = publicLibrary.map((preset) => getSpomovePublicNaming(preset.id)?.status);
    expect(statuses.filter((status) => status === 'applied')).toHaveLength(68);
    expect(statuses.filter((status) => status === 'runtime-deferred')).toHaveLength(3);
    expect(statuses.filter((status) => status === 'name-hold')).toHaveLength(1);
    expect(68 + 3 + 1).toBe(72);
  });

  it('exposes 26 naming roots excluding NAME HOLD', () => {
    const roots = new Set(
      Object.values(SPOMOVE_PUBLIC_NAMING_BY_ID)
        .filter((naming) => naming.status !== 'name-hold' && naming.root.trim())
        .map((naming) => naming.root),
    );
    expect(roots.size).toBe(26);
  });

  it('applies representative root / variant / displayTitle values', () => {
    const fruit = getSpomovePresetDisplayModel(findPublic('reaction-cognition-quad-fruit-10'));
    expect(fruit.rootTitle).toBe('목표 찾아가기');
    expect(fruit.variantLabel).toBe('과일');
    expect(fruit.displayTitle).toBe('목표 찾아가기 · 과일');

    const handFoot = getSpomovePresetDisplayModel(findPublic('visual-reaction-hand-foot-hard-skeleton'));
    expect(handFoot.rootTitle).toBe('손발 맞춰 올리기');
    expect(handFoot.variantLabel).toBe('');

    const flanker = getSpomovePresetDisplayModel(findPublic('flanker-theme-animal-skeleton'));
    expect(flanker.rootTitle).toBe('가운데 색 따라가기');
    expect(flanker.variantLabel).toBe('동물');

    const sequence = getSpomovePresetDisplayModel(findPublic('sequential-memory-5color-51'));
    expect(sequence.rootTitle).toBe('색 순서 기억하기');
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

  it('keeps deferred stroop on legacy display fallback', () => {
    const reverse = getSpomovePresetDisplayModel(findPublic('stroop-arrow-reverse-08'));
    expect(reverse.displayTitle).not.toContain('화살표 규칙 바꿔가기');
    expect(reverse.rootTitle).not.toContain('화살표 규칙 바꿔가기');

    const wordSwitch = getSpomovePresetDisplayModel(findPublic('stroop-arrow-bg-47'));
    expect(wordSwitch.displayTitle).not.toContain('단어 규칙 바꿔가기');
    expect(wordSwitch.variantLabel).not.toBe('그대로');
    expect(getSpomoveCardDisplayModel(findPublic('stroop-arrow-bg-47')).publicMeta.variant).toBeUndefined();

    const wordReverse = getSpomovePresetDisplayModel(findPublic('stroop-word-reverse-48'));
    expect(wordReverse.displayTitle).not.toContain('단어 규칙 바꿔가기');
    expect(wordReverse.variantLabel).not.toBe('반대로');
  });

  it('applies stroop-word-bg-49 immediately', () => {
    const model = getSpomovePresetDisplayModel(findPublic('stroop-word-bg-49'));
    expect(model.rootTitle).toBe('글자색 찾아가기');
    expect(model.displayTitle).toBe('글자색 찾아가기');
  });

  it('keeps full reveal on NAME HOLD fallback while exposing cardCore', () => {
    const model = getSpomovePresetDisplayModel(findPublic('sequential-memory-full-reveal-54'));
    expect(model.displayTitle).toBe(model.rootTitle);
    expect(model.displayTitle.length).toBeGreaterThan(0);
    expect(getSpomovePublicNaming('sequential-memory-full-reveal-54')?.status).toBe('name-hold');
    const card = getSpomoveCardDisplayModel(findPublic('sequential-memory-full-reveal-54'));
    expect(card.publicMeta.core).toBe('기억 과제');
    expect(card.publicMeta.difficulty).toMatch(DIFFICULTY_SLOT);
  });

  it('lets official applied naming beat CMS displayTitle override', () => {
    const model = getSpomovePresetDisplayModel(findPublic('reaction-cognition-quad-fruit-10'), {
      displayTitle: '4분할 자극 · 과일',
      variantLabel: 'CMS variant',
    });
    expect(model.rootTitle).toBe('목표 찾아가기');
    expect(model.variantLabel).toBe('과일');
    expect(model.displayTitle).toBe('목표 찾아가기 · 과일');
    expect(
      getSpomoveCardDisplayModel(findPublic('reaction-cognition-quad-fruit-10'), {
        variantLabel: 'CMS variant',
      }).publicMeta.variant,
    ).toBe('과일');
  });

  it('keeps CMS displayTitle for deferred and hold ids only when legacy path already honors it', () => {
    const deferred = getSpomovePresetDisplayModel(findPublic('stroop-arrow-reverse-08'), {
      displayTitle: 'CMS deferred title',
    });
    expect(deferred.displayTitle).not.toContain('화살표 규칙 바꿔가기');
    expect(deferred.rootTitle).not.toContain('화살표 규칙 바꿔가기');

    const hold = getSpomovePresetDisplayModel(findPublic('sequential-memory-full-reveal-54'), {
      displayTitle: 'CMS hold title',
    });
    expect(hold.displayTitle).not.toBe('');
    expect(getSpomovePublicNaming('sequential-memory-full-reveal-54')?.status).toBe('name-hold');
  });

  it('searches new roots, variants, and legacy titles', () => {
    const goalIds = publicLibrary
      .filter((preset) => getSpomovePresetDisplayModel(preset).rootTitle === '목표 찾아가기')
      .map((preset) => preset.id);
    expect(goalIds).toHaveLength(7);
    for (const id of goalIds) {
      expect(matchesQuery(id, '목표 찾아가기')).toBe(true);
    }

    expect(matchesQuery('reaction-cognition-quad-fruit-10', '과일')).toBe(true);
    expect(matchesQuery('reaction-cognition-quad-fruit-10', '4분할')).toBe(true);
    expect(matchesQuery('simon-camouflage-center-skeleton', '카모플라쥬')).toBe(true);
  });

  it('keeps favorites card title on rootTitle and aria on displayTitle', () => {
    const source = readFileSync(join(process.cwd(), 'app/spokedu-master/favorites/FavoritesView.tsx'), 'utf8');
    expect(source).toContain('title: model.rootTitle');
    expect(source).toContain('accessTitle: model.displayTitle');
    expect(source).toContain('composeSpomovePublicCardMetaParts(card.publicMeta)');
  });

  it('does not put SPOMAT movement copy on color-number public naming', () => {
    const model = getSpomovePresetDisplayModel(findPublic('sequential-memory-color-number-exp'));
    expect(model.rootTitle).toBe('번호 색 기억하기');
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

  it('does not leak previous subtitle composition into Hub cards', () => {
    const hub = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/SpomoveHubView.tsx'), 'utf8');
    expect(hub).toContain('composeSpomovePublicCardMetaParts(card.publicMeta)');
    expect(hub).not.toContain('decisionMeta');
    expect(hub).not.toContain('supportingMeta');
    expect(hub).not.toContain('composeSpomoveCardSubtitleParts');
  });
});
