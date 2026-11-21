import { describe, expect, it } from 'vitest';

import {
  DIVE_THEME_UI,
  isDiveActionMoveUnityTheme,
  resolveDivePanoramaUrls,
  resolveDiveUnityThemeId,
  normalizeDiveThemeId,
  resolveOceanObstacleUrls,
  OCEAN_OBSTACLE_DEFAULTS,
  type DiveThemeEntry,
} from './diveThemes';

const entry = (overrides: Partial<DiveThemeEntry> = {}): DiveThemeEntry => ({
  panoramaPath: 'themes/iiwarmup/spomove_dive/space/panorama.webp',
  panoramaLowPath: 'themes/iiwarmup/spomove_dive/space/panorama-low.webp',
  width: 2048,
  height: 1024,
  fileSize: 1,
  updatedAt: 1,
  hasHighRes: false,
  ...overrides,
});

describe('resolveDivePanoramaUrls', () => {
  it('does not invent a public static panorama path when Hub has no theme entry', () => {
    const urls = resolveDivePanoramaUrls('space', null, () => 'https://cdn.example/unused.webp');
    expect(urls.lowUrl).toBeUndefined();
    expect(urls.highUrl).toBeUndefined();
    expect(urls.yawDeg).toBe(0);
  });

  it('uses Hub preview URLs when the pack entry exists', () => {
    const urls = resolveDivePanoramaUrls('space', entry({ hasHighRes: true, yawDeg: 12 }), (path) => {
      if (!path) return null;
      return `https://cdn.example/${path}`;
    });
    expect(urls.lowUrl).toBe('https://cdn.example/themes/iiwarmup/spomove_dive/space/panorama-low.webp');
    expect(urls.highUrl).toBe('https://cdn.example/themes/iiwarmup/spomove_dive/space/panorama.webp');
    expect(urls.yawDeg).toBe(12);
  });

  it('does not fall back to a missing public path when preview URL is absent', () => {
    const urls = resolveDivePanoramaUrls('space', entry({ hasHighRes: true }), () => null);
    expect(urls.lowUrl).toBeUndefined();
    expect(urls.highUrl).toBeUndefined();
    expect(JSON.stringify(urls)).not.toContain('/spomove/dive/environments/');
  });
});

describe('DIVE Action Move Unity themes', () => {
  it('maps the stable internal theme ids to their Unity Addressables ids', () => {
    expect(resolveDiveUnityThemeId('theme2')).toBe('golden-theme-01');
    expect(resolveDiveUnityThemeId('theme3')).toBe('jungle-adventure-01');
  });

  it('uses the same Action Move path for theme2 and theme3 only', () => {
    expect(isDiveActionMoveUnityTheme('theme2')).toBe(true);
    expect(isDiveActionMoveUnityTheme('theme3')).toBe(true);
    expect(isDiveActionMoveUnityTheme('space')).toBe(false);
  });

  it('only offers SPACE and OCEAN while retaining historical Unity identity', () => {
    expect(DIVE_THEME_UI.map(theme => theme.id)).toEqual(['space', 'ocean']);
    expect(normalizeDiveThemeId('theme2')).toBe('space');
    expect(normalizeDiveThemeId('theme3')).toBe('space');
    expect(normalizeDiveThemeId('ocean')).toBe('ocean');
  });

  it('overrides one obstacle independently and falls back per missing slot', () => {
    const urls = resolveOceanObstacleUrls(entry({ obstacles: { duck: 'custom.png' } }), path => path ? `https://cdn.example/${path}` : null);
    expect(urls).toEqual({ ...OCEAN_OBSTACLE_DEFAULTS, duck: 'https://cdn.example/custom.png' });
  });
});
