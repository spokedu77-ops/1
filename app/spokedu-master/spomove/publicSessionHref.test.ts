import { describe, expect, it } from 'vitest';

import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  publicOfficialPresetSessionHref,
} from './officialSpomovePresets';

describe('public SPOMOVE session links', () => {
  const preset = OFFICIAL_SPOMOVE_LIBRARY.find((p) => p.isReady) ?? OFFICIAL_SPOMOVE_LIBRARY[0]!;

  it('creates public start links without autostart or runtime movement', () => {
    const href = publicOfficialPresetSessionHref(preset, {
      entry: 'start',
      cueSeconds: 3,
    });
    expect(href).toContain('entry=start');
    expect(href).not.toContain('autostart=');
    expect(href).not.toContain('movement=');
    expect(href).not.toContain('limb=');
  });

  it('ignores runtime movement options even when passed dynamically', () => {
    const href = publicOfficialPresetSessionHref(preset, {
      entry: 'start',
      movement: 'handTouch',
      limb: 'free',
    } as never);
    expect(href).toContain('entry=start');
    expect(href).not.toContain('movement=');
    expect(href).not.toContain('limb=');
  });

  it('keeps settings entry without autostart', () => {
    const href = publicOfficialPresetSessionHref(preset, { entry: 'settings' });
    expect(href).toContain('entry=settings');
    expect(href).not.toContain('autostart=');
  });

  it('carries the complete Hub exploration return URL', () => {
    const href = publicOfficialPresetSessionHref(preset, {
      entry: 'start',
      hubReturn: '/spokedu-master/spomove?group=stroop&difficulty=normal&q=화살표',
    });
    expect(new URL(href, 'https://example.test').searchParams.get('hubReturn'))
      .toBe('/spokedu-master/spomove?group=stroop&difficulty=normal&q=화살표');
  });

  it('keeps legacy official href autostart support', () => {
    const href = officialPresetSessionHref(preset, { autostart: true });
    expect(href).toContain('autostart=1');
  });
});
