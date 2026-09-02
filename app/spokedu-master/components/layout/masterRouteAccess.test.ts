import { describe, expect, it } from 'vitest';

import { getMasterRouteRequirement, getSafeMasterReturnPath, isProtectedMasterRoute } from './masterRouteAccess';

const basePath = '/spokedu-master';

describe('SPOKEDU MASTER route access policy', () => {
  it.each([
    '/spokedu-master/landing',
    '/spokedu-master/terms',
    '/spokedu-master/privacy',
    '/spokedu-master/parent/shared-token',
    '/spokedu-master/payment',
    '/spokedu-master/payment/success',
    '/spokedu-master/payment/cancel',
  ])('keeps %s public', (pathname) => {
    expect(isProtectedMasterRoute(pathname, basePath)).toBe(false);
  });

  it.each([
    '/spokedu-master',
    '/spokedu-master/dashboard',
    '/spokedu-master/onboarding',
    '/spokedu-master/library',
    '/spokedu-master/library/42',
    '/spokedu-master/spomove/session',
    '/spokedu-master/unknown-future-screen',
  ])('protects %s by default', (pathname) => {
    expect(isProtectedMasterRoute(pathname, basePath)).toBe(true);
  });

  it('leaves the existing admin shell policy unchanged', () => {
    expect(isProtectedMasterRoute('/admin/spokedu-master/programs', '/admin')).toBe(false);
  });

  it.each([
    ['/spokedu-master/dashboard', 'authenticated'],
    ['/spokedu-master/profile', 'authenticated'],
    ['/spokedu-master/subscription', 'authenticated'],
    ['/spokedu-master/payment', 'authenticated'],
    ['/spokedu-master/onboarding', 'authenticated'],
    ['/spokedu-master/shop', 'authenticated'],
    ['/spokedu-master/library', 'library'],
    ['/spokedu-master/library/42', 'library'],
    ['/spokedu-master/programs', 'library'],
    ['/spokedu-master/favorites', 'library'],
    ['/spokedu-master/manage', 'attendance'],
    ['/spokedu-master/class-tools', 'classTools'],
    ['/spokedu-master/activity', 'attendance'],
    ['/spokedu-master/classes', 'attendance'],
    ['/spokedu-master/classes/class-a', 'attendance'],
    ['/spokedu-master/class-record', 'records'],
    ['/spokedu-master/students', 'attendance'],
    ['/spokedu-master/students/student-a', 'records'],
    ['/spokedu-master/report', 'records'],
    ['/spokedu-master/spomove', 'library'],
    ['/spokedu-master/spomove/session', 'spomove'],
  ])('maps %s to %s capability', (pathname, capability) => {
    expect(getMasterRouteRequirement(pathname, basePath).capability).toBe(capability);
  });

  it.each([
    ['/spokedu-master/dashboard', '/spokedu-master/dashboard'],
    ['/spokedu-master/library/zigzag-running?from=dashboard', '/spokedu-master/library/zigzag-running?from=dashboard'],
    ['/spokedu-master/payment?plan=lite&returnTo=%2Fspokedu-master%2Fprograms', '/spokedu-master/payment?returnTo=%2Fspokedu-master%2Fprograms'],
    ['/spokedu-master/spomove?authKey=x&mode=mobile', '/spokedu-master/spomove?mode=mobile'],
    ['/spokedu-master/programs?source=home', '/spokedu-master/programs?source=home'],
    ['/spokedu-master/shop', '/spokedu-master/shop'],
  ])('keeps safe internal return path %s as %s', (input, expected) => {
    expect(getSafeMasterReturnPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.test/spokedu-master/dashboard',
    '//evil.test/spokedu-master/dashboard',
    'javascript:alert(1)',
    '/class-mode/legacy',
    '/spokedu-master/class-mode/session',
    '/unknown',
  ])('rejects unsafe return path %s', (input) => {
    expect(getSafeMasterReturnPath(input)).toBe('/spokedu-master/dashboard');
  });

  it('preserves SPOMOVE context while removing only commercial and auth secrets', () => {
    expect(getSafeMasterReturnPath(
      '/spokedu-master/spomove/session?preset=A&entry=start&mode=mobile&session=B&returnTo=C&source=home&authKey=x&customerKey=y&paymentKey=z&orderId=o',
    )).toBe('/spokedu-master/spomove/session?preset=A&entry=start&mode=mobile&session=B&returnTo=C&source=home');
  });

  it('does not treat an unknown MASTER child as an allowed return target', () => {
    expect(getSafeMasterReturnPath('/spokedu-master/unknown-future-screen')).toBe('/spokedu-master/dashboard');
  });
});
