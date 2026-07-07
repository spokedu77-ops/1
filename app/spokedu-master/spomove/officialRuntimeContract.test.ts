import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Program } from '../types';
import {
  getOfficialSpomovePresets,
  getPrimaryOfficialSpomovePreset,
  getSpomoveSessionHref,
} from '../lib/program-meta';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  OFFICIAL_SPOMOVE_LIBRARY_SIZE,
  findOfficialSpomovePreset,
  type OfficialSpomoveEngineMode,
} from './officialSpomovePresets';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function programWithRelatedIds(ids: string[]): Program {
  return {
    id: 'program-1',
    lessonDetail: {
      relatedSpomoveIds: ids,
    },
  } as Program;
}

describe('official SPOMOVE runtime contract', () => {
  it(`keeps exactly ${OFFICIAL_SPOMOVE_LIBRARY_SIZE} runnable official preset IDs`, () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
    expect(new Set(OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.id)).size).toBe(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.isReady)).toBe(true);
  });

  it('rejects a non-official preset ID', () => {
    expect(findOfficialSpomovePreset('legacy-drill')).toBeNull();
  });

  it('filters, deduplicates, and preserves official related preset order', () => {
    const first = OFFICIAL_SPOMOVE_LIBRARY[0]!;
    const second = OFFICIAL_SPOMOVE_LIBRARY[1]!;
    const program = programWithRelatedIds([
      'legacy-drill',
      second.id,
      second.id,
      first.id,
      'gonogo',
    ]);

    expect(getOfficialSpomovePresets(program).map((preset) => preset.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(getPrimaryOfficialSpomovePreset(program)?.id).toBe(second.id);
  });

  it('builds session URLs with an official preset query, not a drill query', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY[0]!;
    const href = getSpomoveSessionHref(programWithRelatedIds([preset.id]), preset, 'class');

    expect(href).toContain(`preset=${preset.id}`);
    expect(href).toContain('mode=class');
    expect(href).toContain('program=program-1');
    expect(href).not.toContain('drill=');
  });

  it('limits the MASTER EngineRouter type and branches to seven official modes', () => {
    const supported: OfficialSpomoveEngineMode[] = [
      'basic', 'reactTrain', 'simon', 'flanker', 'stroop', 'spatial', 'flow',
    ];
    const actual = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.engine.mode));
    expect(actual).toEqual(new Set(supported));

    const source = read('app/spokedu-master/spomove/session/EngineRouter.tsx');
    expect(source).not.toMatch(/mode === '(memory|flash|pattern|diagonal|gonogo|taskswitch)'/);
    expect(source).toContain('variant="flow"');
  });

  it('does not consume legacy or remote preset sources in the session', () => {
    const source = read('app/spokedu-master/spomove/session/page.tsx');

    expect(source).not.toMatch(/SESSION_CUES|OFFICIAL_SPOMOVE_PRESETS|USER_SPOMOVE_PRESETS_KEY/);
    expect(source).not.toMatch(/spomove-presets|engineMode|requestedLevel|requestedDuration|requestedSpeed/);
    expect(source).not.toMatch(/\bdrills\b|loadDrills|drills\[0\]/);
    expect(source).toContain('지원하지 않는 SPOMOVE 활동입니다.');
    expect(source).not.toContain("fetch('/api/spokedu-master/access'");

    expect(source).not.toContain('class-record?program=${officialPreset.id}');
    expect(source).toContain('recordProgramHref');

    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    expect(shell).toContain('pathname.startsWith(`${basePath}/spomove/session`)');
  });

  it('does not keep the removed class plan route around as dead runtime code', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/plan/page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/plan/PlanView.tsx'))).toBe(false);
  });

  it('does not translate legacy drill IDs in the public programs API', () => {
    const source = read('app/api/spokedu-master/programs/route.ts');

    expect(source).toContain('findOfficialSpomovePreset');
    expect(source).not.toMatch(/'SR-05':|'RS-05':|'IC-05':|'gonogo'|'taskswitch'/);
  });

  it('removes the MASTER preset save connection from admin Training', () => {
    const source = read('app/admin/spomove/training/page.tsx');

    expect(source).not.toMatch(/saveMasterLaunchPreset|spomove-presets|USER_SPOMOVE_PRESETS_KEY/);
    expect(source).not.toContain('구독 SPOMOVE 프리셋으로 저장');
  });

  it('does not link to a preset-less session from subscription', () => {
    const source = read('app/spokedu-master/subscription/page.tsx');

    expect(source).not.toContain('href="/spokedu-master/spomove/session"');
  });

  it('removes the unused MASTER drills and remote preset runtime', () => {
    const store = read('app/spokedu-master/store/index.ts');
    const data = read('app/spokedu-master/lib/data.ts');

    expect(store).not.toMatch(/\bdrillsLoaded\b|\bdrillsError\b|\bloadDrills\b/);
    expect(data).not.toMatch(/export const SESSION_CUES|export const DRILLS/);
    expect(fs.existsSync(path.join(process.cwd(), 'app/api/spokedu-master/drills/route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'app/api/spokedu-master/spomove-presets/route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/lib/spomovePresets.ts'))).toBe(false);
  });
});
