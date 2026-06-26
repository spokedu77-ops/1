import { describe, expect, it } from 'vitest';

import { isProtectedMasterRoute } from './masterRouteAccess';

const basePath = '/spokedu-master';

describe('SPOKEDU MASTER route access policy', () => {
  it.each([
    '/spokedu-master/landing',
    '/spokedu-master/terms',
    '/spokedu-master/privacy',
    '/spokedu-master/payment',
    '/spokedu-master/payment/success',
    '/spokedu-master/payment/cancel',
    '/spokedu-master/onboarding',
    '/spokedu-master/parent/shared-token',
  ])('keeps %s public', (pathname) => {
    expect(isProtectedMasterRoute(pathname, basePath)).toBe(false);
  });

  it.each([
    '/spokedu-master',
    '/spokedu-master/dashboard',
    '/spokedu-master/library',
    '/spokedu-master/class-mode/42',
    '/spokedu-master/spomove/session',
    '/spokedu-master/unknown-future-screen',
  ])('protects %s by default', (pathname) => {
    expect(isProtectedMasterRoute(pathname, basePath)).toBe(true);
  });

  it('leaves the existing admin shell policy unchanged', () => {
    expect(isProtectedMasterRoute('/admin/spokedu-master/programs', '/admin')).toBe(false);
  });
});
