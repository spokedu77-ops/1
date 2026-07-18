import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';

const WEBGL_LOW_SPEC_PLANNED_IDS = [
  'dive-standard',
  'dive-random',
  'dive-color-gate-61',
  'visual-reaction-wormhole-41',
] as const;

describe('저사양 모드 계획', () => {
  it('LOW_SPEC_PLAN.md가 존재하고 WebGL 대상 프리셋을 문서화한다', () => {
    const planPath = path.join(process.cwd(), 'app/spokedu-master/spomove/LOW_SPEC_PLAN.md');
    expect(fs.existsSync(planPath)).toBe(true);
    const source = fs.readFileSync(planPath, 'utf8');
    for (const id of WEBGL_LOW_SPEC_PLANNED_IDS) {
      expect(source).toContain(id);
    }
  });

  it('WebGL 저사양 계획 대상 공식 프리셋이 라이브러리에 존재한다', () => {
    for (const id of WEBGL_LOW_SPEC_PLANNED_IDS) {
      expect(OFFICIAL_SPOMOVE_LIBRARY.some((preset) => preset.id === id)).toBe(true);
    }
  });
});
