import { describe, expect, it } from 'vitest';
import { isFullscreenPath, isPublicMarketingPath } from './fullscreen-paths';

describe('fullscreen path aliases', () => {
  it.each([
    '/spokedu-lab',
    '/spokedu-lab/dashboard',
    '/spokedu-master',
    '/spokedu-master/dashboard',
  ])('uses the same fullscreen shell for %s', (pathname) => {
    expect(isFullscreenPath(pathname)).toBe(true);
  });

  it('treats only the LAB introduction root as public marketing', () => {
    expect(isPublicMarketingPath('/spokedu-lab')).toBe(true);
    expect(isPublicMarketingPath('/spokedu-lab/dashboard')).toBe(false);
    expect(isPublicMarketingPath('/spokedu-lab/library')).toBe(false);
  });
});
