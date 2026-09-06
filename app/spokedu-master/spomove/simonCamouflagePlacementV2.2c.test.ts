import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { canLaunchInternalSpomoveCandidate } from './internalSpomoveCandidateAccess';
import { deriveFamilyIdForPresetId } from './movements/activityFamilies';
import { isHubListedPreset, isHubRunnablePreset } from './movements/isHubVisiblePreset';
import {
  findOfficialSpomovePreset,
  OFFICIAL_SPOMOVE_LIBRARY,
} from './officialSpomovePresets';
import {
  resolveSimonL4CamouflageConcurrent,
  resolveSimonL4CamouflagePlacementMode,
} from './resolveSimonL4CamouflagePlacementMode';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';

const CANDIDATE_A = 'simon-camouflage-center-v2';
const CANDIDATE_B = 'simon-camouflage-variant-v2';
const PUBLIC_CENTER = 'simon-camouflage-center-skeleton';
const BLACKOUT = 'visual-reaction-blackout-37';

function publicLibrary() {
  return OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
}

function engineCore(engine: Record<string, unknown>) {
  return {
    mode: engine.mode,
    level: engine.level,
    simonPoleCount: engine.simonPoleCount,
  };
}

describe('SPOMOVE 2C simon camouflage placement candidates', () => {
  it('1 — Public 72 유지, 신규 ID는 카탈로그에 없음', () => {
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).toHaveLength(72);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_A);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_B);
    expect(publicLibrary()).toHaveLength(72);
    expect(publicLibrary().map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('2–3 — 후보 HOLD/internalCandidate', () => {
    for (const id of [CANDIDATE_A, CANDIDATE_B]) {
      const preset = findOfficialSpomovePreset(id);
      expect(preset).toBeTruthy();
      expect(preset?.catalogStatus).toBe('hold');
      expect(preset?.internalCandidate).toBe(true);
      expect(isHubListedPreset(preset!)).toBe(false);
      expect(isHubRunnablePreset(preset!)).toBe(false);
      expect(canLaunchInternalSpomoveCandidate(preset, false)).toBe(false);
      expect(canLaunchInternalSpomoveCandidate(preset, undefined)).toBe(false);
      expect(canLaunchInternalSpomoveCandidate(preset, true)).toBe(true);
      expect(preset?.engine.mode).toBe('simon');
      expect(preset?.engine.level).toBe(4);
      expect(preset?.engine.camouflagePlacementResponse).toBe('preset');
      expect(preset?.engine.simonPoleCount).toBeUndefined();
    }
  });

  it('4 — Candidate A center → placementMode center', () => {
    const preset = findOfficialSpomovePreset(CANDIDATE_A);
    expect(preset?.engine).toEqual({
      mode: 'simon',
      level: 4,
      camouflagePlacement: 'center',
      camouflagePlacementResponse: 'preset',
    });
    expect(
      resolveSimonL4CamouflagePlacementMode({
        camouflagePlacement: preset?.engine.camouflagePlacement,
        camouflagePlacementResponse: preset?.engine.camouflagePlacementResponse,
      }),
    ).toBe('center');
  });

  it('5 — Candidate B variant → placementMode variant', () => {
    const preset = findOfficialSpomovePreset(CANDIDATE_B);
    expect(preset?.engine).toEqual({
      mode: 'simon',
      level: 4,
      camouflagePlacement: 'variant',
      camouflagePlacementResponse: 'preset',
    });
    expect(
      resolveSimonL4CamouflagePlacementMode({
        camouflagePlacement: preset?.engine.camouflagePlacement,
        camouflagePlacementResponse: preset?.engine.camouflagePlacementResponse,
      }),
    ).toBe('variant');
  });

  it('6 — 기존 Public center-skeleton engine 불변', () => {
    expect(findOfficialSpomovePreset(PUBLIC_CENTER)?.engine).toEqual({
      mode: 'simon',
      level: 4,
      camouflagePlacement: 'center',
    });
  });

  it('7 — 기존 Public Runtime은 여전히 legacy variant', () => {
    const publicPreset = findOfficialSpomovePreset(PUBLIC_CENTER);
    expect(
      resolveSimonL4CamouflagePlacementMode({
        camouflagePlacement: publicPreset?.engine.camouflagePlacement,
        camouflagePlacementResponse: publicPreset?.engine.camouflagePlacementResponse,
      }),
    ).toBe('variant');
    const router = fs.readFileSync(
      path.join(process.cwd(), 'app/spokedu-master/spomove/session/EngineRouter.tsx'),
      'utf8',
    );
    expect(router).toContain('resolveSimonL4CamouflagePlacementMode');
    expect(router).toMatch(/mode === 'simon' && level === 4/);
    expect(router).not.toMatch(/if \(mode === 'simon' && level === 4\)[\s\S]{0,400}placementMode="variant"/);
  });

  it('8 — blackout 불변', () => {
    expect(findOfficialSpomovePreset(BLACKOUT)?.engine).toEqual({
      mode: 'simon',
      level: 4,
      camouflagePlacement: 'variant',
    });
    expect(
      resolveSimonL4CamouflagePlacementMode({
        camouflagePlacement: 'variant',
      }),
    ).toBe('variant');
  });

  it('9 — 다른 Simon preset에 신규 option 없음', () => {
    for (const id of [
      'simon-pole-arrows-41',
      'simon-pole-shape-06',
      'simon-balloon-flash-05',
      'simon-mixed-gallery-exp',
    ]) {
      const engine = findOfficialSpomovePreset(id)?.engine;
      expect(engine?.camouflagePlacementResponse).toBeUndefined();
    }
    expect(findOfficialSpomovePreset('simon-pole-shape-06')?.engine).toEqual({
      mode: 'simon',
      level: 1,
      simonPoleCount: 1,
    });
    expect(findOfficialSpomovePreset('simon-pole-arrows-41')?.engine.mode).toBe('simon');
    expect(findOfficialSpomovePreset('simon-balloon-flash-05')?.engine.mode).toBe('simon');
    expect(findOfficialSpomovePreset('simon-mixed-gallery-exp')?.engine).toEqual({
      mode: 'simon',
      level: 3,
    });
  });

  it('10–11 — 후보 Family·Root mechanic 동일', () => {
    expect(deriveFamilyIdForPresetId(CANDIDATE_A)).toBe('simon-mixed');
    expect(deriveFamilyIdForPresetId(CANDIDATE_B)).toBe('simon-mixed');
    expect(deriveFamilyIdForPresetId(PUBLIC_CENTER)).toBe('simon-mixed');
    const a = findOfficialSpomovePreset(CANDIDATE_A)!;
    const b = findOfficialSpomovePreset(CANDIDATE_B)!;
    expect(a.engine.mode).toBe(b.engine.mode);
    expect(a.engine.level).toBe(b.engine.level);
    expect(a.cueSeconds).toBe(b.cueSeconds);
    expect(a.rounds).toBe(b.rounds);
  });

  it('12 — placement 외 engine 차이 없음, concurrent 동일', () => {
    const a = findOfficialSpomovePreset(CANDIDATE_A)!.engine;
    const b = findOfficialSpomovePreset(CANDIDATE_B)!.engine;
    expect(engineCore(a)).toEqual(engineCore(b));
    expect(a.camouflagePlacement).toBe('center');
    expect(b.camouflagePlacement).toBe('variant');
    expect(resolveSimonL4CamouflageConcurrent(a.simonPoleCount)).toBe(1);
    expect(resolveSimonL4CamouflageConcurrent(b.simonPoleCount)).toBe(1);
    expect(resolveSimonL4CamouflageConcurrent(findOfficialSpomovePreset(PUBLIC_CENTER)?.engine.simonPoleCount)).toBe(1);
  });

  it('13 — 일반 구독자 direct URL 차단, 2A/2B 불변', () => {
    expect(canLaunchInternalSpomoveCandidate(findOfficialSpomovePreset(CANDIDATE_A), false)).toBe(false);
    expect(findOfficialSpomovePreset('stroop-arrow-direction-color-v2')?.engine).toEqual({
      mode: 'stroop',
      level: 1,
      stroopArrowResponse: 'movement',
    });
    expect(findOfficialSpomovePreset('stroop-word-switch-movement-v2')?.engine).toEqual({
      mode: 'stroop',
      level: 2,
      stroopWordResponse: 'movement',
      stroopWordRuleMode: 'switch',
    });
    expect(findOfficialSpomovePreset('stroop-word-reverse-movement-v2')?.engine).toEqual({
      mode: 'stroop',
      level: 3,
      stroopWordResponse: 'movement',
      stroopWordRuleMode: 'reverse',
    });
  });
});
