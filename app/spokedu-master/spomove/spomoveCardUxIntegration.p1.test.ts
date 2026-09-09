import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import {
  getSpomoveCardDisplayModel,
  resolveSpomoveCardPairKey,
} from './spomovePresetDisplayModel';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const publicLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const preview = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');

describe('SPOMOVE-MASTER-CARD-UX-P1-01', () => {
  it('keeps public 72 catalog order from P0', () => {
    expect(publicLibrary).toHaveLength(72);
    expect(publicLibrary.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('keeps discovery card body compact and independent from URL reads', () => {
    expect(hub).toContain('data-spm-spomove-card-body');
    expect(hub).toContain('card.publicMeta');
    expect(hub).toContain('composeSpomovePublicCardMetaParts');
    expect(hub).not.toContain('decisionMeta');
    expect(hub).not.toContain('supportingMeta');
    expect(hub).toContain('min-h-[84px]');
    expect(hub).not.toContain('useSearchParams().get(\'programGroup\')');
  });

  it('distinguishes default Family landing from selected Family results', () => {
    expect(hub).toContain('selectedFamilyId === null');
    expect(hub).toContain('familyFiltered.slice(0, 4)');
    expect(hub).toContain('familyPreview');
  });

  it('keeps P0 semantic badge contract for all public cards', () => {
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset, {
        catalogTags: ['오염', '보통', '초등 전학년·특수'],
      });
      expect(card.badges.length).toBeLessThanOrEqual(3);
      expect(card.badges.some((badge) => badge.value === '오염')).toBe(false);
      expect(card.badges.every((badge) => !badge.value.endsWith('·'))).toBe(true);
      expect(card.publicMeta.difficulty).toMatch(/^난이도 (쉬움|보통|어려움)$/u);
      expect(card.badges.some((badge) => badge.value === '쉬움' || badge.value === '보통' || badge.value === '어려움')).toBe(false);
    }
  });

  it('keeps pair metadata structure identical for normal/hard variants', () => {
    const byPair = new Map<string, ReturnType<typeof getSpomoveCardDisplayModel>[]>();
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset);
      if (card.publicMeta.variant) continue;
      const key = `${preset.programGroup}::${resolveSpomoveCardPairKey(card.title)}`;
      const list = byPair.get(key) ?? [];
      list.push(card);
      byPair.set(key, list);
    }
    let pairs = 0;
    for (const cards of byPair.values()) {
      if (cards.length < 2) continue;
      pairs += 1;
      const base = {
        responseType: cards[0]!.meta.responseType,
        trainingFocus: cards[0]!.meta.trainingFocus,
      };
      for (const card of cards.slice(1)) {
        expect({
          responseType: card.meta.responseType,
          trainingFocus: card.meta.trainingFocus,
        }).toEqual(base);
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(5);
  });

  it('keeps execution actions in Preview and out of Browse cards', () => {
    expect(hub).not.toContain('활동 준비');
    expect(hub).not.toContain('시작 설정');
    expect(hub).toContain('data-spm-spomove-card-action="preview"');
    expect(preview).toContain('활동 준비');
    expect(preview).toContain('시작 설정');
    expect(preview).toContain('spm-btn-primary');
    expect(hub).not.toContain('<Play ');
    expect(hub).toContain("import { Bookmark, ChevronDown, Search, X } from 'lucide-react'");
    expect(hub).toContain('h-11 w-11');
  });

  it('keeps both prepare and settings routes available from Preview', () => {
    expect(preview).toContain("sessionHref('start')");
    expect(preview).toContain("sessionHref('settings')");
  });

  it('uses four-column desktop density and the Home-aligned square card ratio', () => {
    expect(hub).toContain(
      'grid grid-cols-1 gap-4 min-[431px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    );
    expect(hub).not.toContain('min-h-[300px]');
    expect(hub).toContain('aspect-square');
  });

  it('uses one PresetCard path for all hub surfaces', () => {
    expect(hub).toContain('function PresetCard');
    expect(hub).toContain('<PresetCard');
    expect(hub).not.toContain('function SimonPresetCard');
    expect(hub).not.toContain('function FlankerPresetCard');
  });
});
