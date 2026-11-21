import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SettingsBriefing } from '@/app/spokedu-master/spomove/session/SettingsBriefing';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { resolveSpomoveExecutionVolume } from '@/app/spokedu-master/spomove/session/resolveSpomoveExecutionVolume';
import { SpaceEnvironment } from '@/app/admin/spomove/training/_player/flow-lab/engine/renderers/SpaceEnvironment';
import type { DivePanoramaStatus } from './diveThemes';
import { DiveBackgroundNotice } from '@/app/components/spomove/DiveThemeSelector';

vi.mock('@/app/lib/admin/hooks/useSpomoveDiveEnvironments', () => ({ useSpomoveDiveEnvironments: () => ({ data: { themes: {} }, loading: false }) }));

describe('DIVE background selection integration', () => {
  for (const id of ['dive-standard', 'dive-color-gate-61', 'dive-beat-rush']) {
    it(`${id} offers the same active theme choices independently of volume`, () => {
      const preset = findOfficialSpomovePreset(id)!;
      const volume = resolveSpomoveExecutionVolume({ preset, cueSeconds: 2, rounds: 10 });
      const props: React.ComponentProps<typeof SettingsBriefing> = {
        preset, matCount: 1, executionVolume: volume, audioMode: 'silent', onAudioModeChange: vi.fn(), bgmAvailable: false,
        startDisabled: false, cueSeconds: 2, recommendedCueSeconds: 2, onCueSecondsChange: vi.fn(), repetitionCount: 10,
        onRepetitionCountChange: vi.fn(), diveEnvironmentTheme: 'ocean', onDiveEnvironmentThemeChange: vi.fn(), sportsArenaFeatures: [],
        onSportsArenaFeaturesChange: vi.fn(), flowDuration: 20, onFlowDurationChange: vi.fn(), flowIncludeBonus: true,
        onFlowIncludeBonusChange: vi.fn(), onStart: vi.fn(),
      };
      const html = renderToStaticMarkup(React.createElement(SettingsBriefing, props));
      expect(html).toContain('DIVE 환경 테마');
      expect(html.indexOf('>SPACE</button>')).toBeLessThan(html.indexOf('>OCEAN</button>'));
      expect(html).not.toContain('놀이공원');
      expect(props.executionVolume).toEqual(volume);
      expect(props.onFlowDurationChange).not.toHaveBeenCalled();
      expect(props.onRepetitionCountChange).not.toHaveBeenCalled();
    });
  }

  it('reports low-res success, missing registration and failed loading without retaining a stale image', async () => {
    const statuses: DivePanoramaStatus[] = [];
    const texture = new THREE.Texture();
    const environment = new SpaceEnvironment({ scene: new THREE.Scene(), qualityTier: 'LOW', ocean: true,
      onPanoramaStatus: status => statuses.push(status), _loadFn: async url => { if (url === 'low') return texture; throw Error('unavailable'); } });
    await environment.loadPanorama('high', 'low');
    expect(statuses).toEqual(['loading', 'ready']);
    expect(environment.getPanoTex()).toBe(texture);
    await environment.loadPanorama();
    expect(environment.getPanoTex()).toBeNull();
    expect(statuses.at(-1)).toBe('unregistered');
    await environment.loadPanorama('missing');
    expect(statuses.at(-1)).toBe('failed');
    expect(environment.getPanoTex()).toBeNull();
    const notice = renderToStaticMarkup(React.createElement(DiveBackgroundNotice, { theme: 'ocean', status: 'failed' }));
    expect(notice).toContain('OCEAN'); expect(notice).toContain('기본 배경'); expect(notice).not.toContain('SPACE');
    environment.dispose();
  });
});
