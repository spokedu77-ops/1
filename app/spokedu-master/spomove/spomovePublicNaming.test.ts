import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import {
  buildSpomovePresetSearchHaystack,
  composeSpomoveCardSubtitleParts,
  getSpomoveCardDisplayModel,
  getSpomovePresetDisplayModel,
} from './spomovePresetDisplayModel';
import {
  SPOMOVE_PUBLIC_NAMING_BY_ID,
  getSpomovePublicNaming,
} from './spomovePublicNaming';

const publicLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');

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
    expect(handFoot.variantLabel).toBe('어려움');

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
    }
  });

  it('keeps deferred stroop on legacy display fallback', () => {
    const reverse = getSpomovePresetDisplayModel(findPublic('stroop-arrow-reverse-08'));
    expect(reverse.displayTitle).not.toContain('화살표 규칙 바꿔가기');
    expect(reverse.rootTitle).not.toContain('화살표 규칙 바꿔가기');

    const wordSwitch = getSpomovePresetDisplayModel(findPublic('stroop-arrow-bg-47'));
    expect(wordSwitch.displayTitle).not.toContain('단어 규칙 바꿔가기');
    expect(wordSwitch.variantLabel).not.toBe('그대로');

    const wordReverse = getSpomovePresetDisplayModel(findPublic('stroop-word-reverse-48'));
    expect(wordReverse.displayTitle).not.toContain('단어 규칙 바꿔가기');
    expect(wordReverse.variantLabel).not.toBe('반대로');
  });

  it('applies stroop-word-bg-49 immediately', () => {
    const model = getSpomovePresetDisplayModel(findPublic('stroop-word-bg-49'));
    expect(model.rootTitle).toBe('글자색 찾아가기');
    expect(model.displayTitle).toBe('글자색 찾아가기');
  });

  it('keeps full reveal on NAME HOLD fallback', () => {
    const model = getSpomovePresetDisplayModel(findPublic('sequential-memory-full-reveal-54'));
    expect(model.displayTitle).toBe(model.rootTitle);
    expect(model.displayTitle.length).toBeGreaterThan(0);
    expect(getSpomovePublicNaming('sequential-memory-full-reveal-54')?.status).toBe('name-hold');
  });

  it('lets official applied naming beat CMS displayTitle override', () => {
    const model = getSpomovePresetDisplayModel(findPublic('reaction-cognition-quad-fruit-10'), {
      displayTitle: '4분할 자극 · 과일',
    });
    expect(model.rootTitle).toBe('목표 찾아가기');
    expect(model.variantLabel).toBe('과일');
    expect(model.displayTitle).toBe('목표 찾아가기 · 과일');
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

  it('dedupes variant difficulty against 난이도 badge in card subtitle', () => {
    const card = getSpomoveCardDisplayModel(findPublic('visual-reaction-hand-foot-hard-skeleton'));
    const decisionMeta = card.meta.difficulty ?? card.meta.responseType;
    const supportingMeta = card.meta.responseType === decisionMeta ? card.meta.trainingFocus : card.meta.responseType;
    const parts = composeSpomoveCardSubtitleParts(card.variantLabel, decisionMeta, supportingMeta);
    expect(parts[0]).toBe('어려움');
    expect(parts.some((part) => part === '난이도 어려움')).toBe(false);
    expect(parts.filter((part) => part.includes('어려움'))).toHaveLength(1);
  });

  it('keeps favorites card title on rootTitle and aria on displayTitle', () => {
    const source = readFileSync(join(process.cwd(), 'app/spokedu-master/favorites/FavoritesView.tsx'), 'utf8');
    expect(source).toContain('title: model.rootTitle');
    expect(source).toContain('accessTitle: model.displayTitle');
    expect(source).toContain('composeSpomoveCardSubtitleParts(card.variantLabel');
  });

  it('does not put SPOMAT movement copy on color-number public naming', () => {
    const model = getSpomovePresetDisplayModel(findPublic('sequential-memory-color-number-exp'));
    expect(model.rootTitle).toBe('번호 색 기억하기');
    expect(model.variantLabel).toBe('퀴즈');
    expect(model.displayTitle).not.toMatch(/SPOMAT|이동/u);
  });
});
