import { describe, expect, it } from 'vitest';

import {
  DIVE_THEME_UI,
  isDiveActionMoveUnityTheme,
  resolveDivePanoramaUrls,
  resolveDiveUnityThemeId,
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

  it('shows the approved Korean labels without changing internal ids', () => {
    expect(DIVE_THEME_UI).toEqual(expect.arrayContaining([
      { id: 'theme2', label: '놀이공원' },
      { id: 'theme3', label: '정글' },
    ]));
  });
});
