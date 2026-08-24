import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import {
  getSpomoveCardDisplayModel,
  resolveSpomoveCardPairKey,
  titleIncludesDifficulty,
} from './spomovePresetDisplayModel';
import { supportsCueSpeedOverride } from './spomoveCueSpeed';
import { getSpomoveDifficultyKind } from './spomoveDifficulty';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const publicLibrary = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');

describe('SPOMOVE-MASTER-CARD-UX-P1-01', () => {
  it('keeps public 72 catalog order from P0', () => {
    expect(publicLibrary).toHaveLength(72);
    expect(publicLibrary.map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('gates programLabel via Hub context prop (not URL reads inside Card)', () => {
    expect(hub).toContain('showProgramLabel={showProgramLabel}');
    expect(hub).toContain('const showProgramLabel = activeProgramGroup === \'all\'');
    expect(hub).toContain('data-spm-spomove-show-program-label={showProgramLabel ? \'true\' : \'false\'}');
    expect(hub).toContain('data-spm-spomove-card-program-label="true"');
    expect(hub).toContain('showProgramLabel ? (');
    expect(hub).not.toContain('useSearchParams().get(\'programGroup\')');
  });

  it('documents programLabel visibility matrix in Hub context', () => {
    // 전체 / 즐겨찾기 전체 → all → label on
    expect(hub).toMatch(/activeProgramGroup === 'all'/);
    // 특정 programGroup 필터·즐겨찾기+그룹 → label off (same expression)
    expect(hub).toContain("const showProgramLabel = activeProgramGroup === 'all'");
  });

  it('keeps P0 semantic badge contract for all public cards', () => {
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset, {
        catalogTags: ['오염', '보통', '초등 전학년·특수'],
      });
      expect(card.badges.length).toBeLessThanOrEqual(3);
      expect(card.badges.some((badge) => badge.value === '오염')).toBe(false);
      expect(card.badges.every((badge) => !badge.value.endsWith('·'))).toBe(true);
      if (titleIncludesDifficulty(card.title)) {
        expect(card.badges.some((badge) => badge.slot === 'difficulty')).toBe(false);
      }
    }
  });

  it('keeps pair metadata structure identical for normal/hard variants', () => {
    const byPair = new Map<string, ReturnType<typeof getSpomoveCardDisplayModel>[]>();
    for (const preset of publicLibrary) {
      const card = getSpomoveCardDisplayModel(preset);
      if (!titleIncludesDifficulty(card.title)) continue;
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

  it('keeps P0 action grammar: 활동 준비 primary, settings secondary, no Play', () => {
    expect(hub).toContain('활동 준비');
    expect(hub).toContain('시작 설정');
    expect(hub).toContain('data-spm-spomove-start-mode="guide"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).toContain('spm-btn-primary');
    expect(hub).not.toContain('<Play ');
    expect(hub).toMatch(/import \{ Bookmark, Lock, MonitorPlay \} from 'lucide-react'/);
    expect(hub).toContain('h-8 w-8');
  });

  it('shows settings CTA only when cue/difficulty override exists (contract source)', () => {
    expect(hub).toContain('supportsCueSpeedOverride(preset) || Boolean(getSpomoveDifficultyKind(preset))');
    let withSettings = 0;
    let withoutSettings = 0;
    for (const preset of publicLibrary) {
      const show = supportsCueSpeedOverride(preset) || Boolean(getSpomoveDifficultyKind(preset));
      if (show) withSettings += 1;
      else withoutSettings += 1;
    }
    expect(withSettings).toBeGreaterThan(0);
    expect(withoutSettings).toBeGreaterThan(0);
  });

  it('keeps desktop 4-col grid and responsive breakpoints (no silent 3-col desktop)', () => {
    expect(hub).toContain(
      'grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4',
    );
    expect(hub).not.toContain('xl:grid-cols-3');
    expect(hub).toContain('min-h-[300px]');
    expect(hub).toContain('aspect-[6/5]');
  });

  it('uses one PresetCard path for all hub surfaces', () => {
    expect(hub).toContain('function PresetCard');
    expect(hub).toContain('<PresetCard');
    expect(hub).not.toContain('function SimonPresetCard');
    expect(hub).not.toContain('function FlankerPresetCard');
  });
});
