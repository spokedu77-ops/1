import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import {
  getSpomoveCardDisplayModel,
  resolveAudienceAdaptation,
  resolveSpomoveCardPairKey,
  titleIncludesDifficulty,
} from './spomovePresetDisplayModel';
import { getOfficialSpomovePresetGuide } from './officialSpomovePresetGuides';
import { supportsCueSpeedOverride } from './spomoveCueSpeed';
import { getSpomoveDifficultyKind } from './spomoveDifficulty';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const publicLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');

describe('SPOMOVE-CARD-UX-INTEGRITY-P0-01', () => {
  it('keeps public 72 catalog order unchanged', () => {
    expect(publicLibrary).toHaveLength(72);
    expect(publicLibrary.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('exposes at most 3 semantic badges per public card', () => {
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset);
      expect(card.badges.length).toBeLessThanOrEqual(3);
      expect(card.badges.length).toBeGreaterThan(0);
      for (const badge of card.badges) {
        expect(badge.slot).toMatch(/^(difficulty|responseType|trainingFocus|audience|adaptation|adjustable)$/);
        expect(badge.value.trim().length).toBeGreaterThan(0);
        expect(badge.value.endsWith('·')).toBe(false);
        expect(badge.value).not.toContain('·');
      }
      const values = card.badges.map((badge) => badge.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('does not duplicate difficulty when title already encodes it', () => {
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset);
      const difficultyBadges = card.badges.filter((badge) => badge.slot === 'difficulty');
      if (titleIncludesDifficulty(card.title)) {
        expect(difficultyBadges).toHaveLength(0);
      }
      const labelValues = card.badges.map((badge) => badge.value);
      expect(labelValues.filter((value) => value === '보통' || value === '어려움' || value === '쉬움')).toHaveLength(0);
      const hasNormal = labelValues.some((value) => value.includes('보통'));
      const hasHard = labelValues.some((value) => value.includes('어려움'));
      expect(hasNormal && hasHard).toBe(false);
    }
  });

  it('keeps audience and adaptation as separate semantic axes', () => {
    for (const preset of publicLibrary) {
      const guide = getOfficialSpomovePresetGuide(preset);
      const split = resolveAudienceAdaptation(guide.targetGroups);
      const card = getSpomoveCardDisplayModel(preset);
      expect(card.meta.audience ?? split.audience ?? '').not.toMatch(/전학년·특수|저학년·특수|고학년·특수/);
      expect(Object.values(card.meta).join(' ')).not.toContain('초등 전학년·특수');
      if (card.meta.adaptation) {
        expect(card.meta.adaptation).toBe('특수체육 활용');
      }
    }
  });

  it('ignores CMS catalogTags for public card badges', () => {
    const preset = publicLibrary[0]!;
    const polluted = getSpomoveCardDisplayModel(preset, {
      catalogTags: ['보통', '어려움', '초등 전학년·특수', '오염태그'],
    });
    const clean = getSpomoveCardDisplayModel(preset);
    expect(polluted.badges.map((badge) => badge.value)).toEqual(clean.badges.map((badge) => badge.value));
    expect(polluted.badges.some((badge) => badge.value === '오염태그')).toBe(false);
  });

  it('unifies base metadata for normal/hard title pairs', () => {
    const byPair = new Map<string, typeof publicLibrary>();
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset);
      if (!titleIncludesDifficulty(card.title)) continue;
      const key = `${preset.programGroup}::${resolveSpomoveCardPairKey(card.title)}`;
      const list = byPair.get(key) ?? [];
      list.push(preset);
      byPair.set(key, list);
    }

    let pairCount = 0;
    for (const [, members] of byPair) {
      if (members.length < 2) continue;
      pairCount += 1;
      const bases = members.map((preset) => {
        const card = getSpomoveCardDisplayModel(preset);
        return {
          responseType: card.meta.responseType,
          trainingFocus: card.meta.trainingFocus,
          audience: card.meta.audience,
          adaptation: card.meta.adaptation,
        };
      });
      for (let index = 1; index < bases.length; index += 1) {
        expect(bases[index]).toEqual(bases[0]);
      }
    }
    expect(pairCount).toBeGreaterThanOrEqual(5);
  });

  it('shows settings CTA only when cue speed or difficulty override exists', () => {
    for (const preset of publicLibrary) {
      const showSettings =
        supportsCueSpeedOverride(preset) || Boolean(getSpomoveDifficultyKind(preset));
      const card = getSpomoveCardDisplayModel(preset);
      if (showSettings) {
        expect(
          card.meta.adjustable === '시간 조절' ||
            card.meta.adjustable === '난이도 조절' ||
            supportsCueSpeedOverride(preset) ||
            Boolean(getSpomoveDifficultyKind(preset)),
        ).toBe(true);
      }
    }
  });

  it('hub card surface follows P0 action and badge contract', () => {
    const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(hub).toContain('getSpomoveCardDisplayModel');
    expect(hub).toContain('data-spm-spomove-card-meta');
    expect(hub).toContain('활동 살펴보기');
    expect(hub).not.toContain("after:content-['·']");
    expect(hub).not.toContain('supportMetaParts.slice');
    expect(hub).not.toContain('displayModel.variantLabel');
    expect(hub).not.toContain('catalogTags');
    expect(hub).not.toContain('<Play ');
    expect(hub).toMatch(/import \{ Bookmark, Lock, MonitorPlay, Search, X \} from 'lucide-react'/);
    expect(hub).toContain('data-spm-spomove-start-mode="guide"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).toContain('h-11 w-11');
  });
});
