import { describe, expect, it } from 'vitest';

import {
  buildMasterLoginHref,
  getSafeMasterLoginReturnPath,
  resolveMasterEntryAccess,
  resolveMasterEntryDestination,
} from './masterLoginReturn';

describe('SPOKEDU MASTER safe login return', () => {
  it.each([
    '/spokedu-master/dashboard', '/spokedu-master/programs', '/spokedu-master/favorites',
    '/spokedu-master/manage', '/spokedu-master/library?q=%EB%86%8D%EA%B5%AC',
    '/spokedu-master/class-tools', '/spokedu-master/class-record',
    '/spokedu-master/students/student-1', '/spokedu-master/report',
    '/spokedu-master/activity', '/spokedu-master/classes/class-1',
    '/spokedu-master/spomove', '/spokedu-master/profile',
    '/spokedu-master/subscription', '/spokedu-master/payment',
    '/spokedu-master/shop',
    '/spokedu-master/promotions/redeem',
  ])('preserves an approved internal deep-link: %s', (path) => {
    expect(getSafeMasterLoginReturnPath(path)).toBe(path);
    expect(buildMasterLoginHref(path)).toContain(encodeURIComponent(path));
  });

  it.each([
    'https://example.com', 'http://example.com', '//example.com',
    'javascript:alert(1)', 'data:text/html,hello', '/admin',
    '/spokedu-master/unknown-route', '/spokedu-master/login',
    '/spokedu-master/auth/callback',
  ])('falls back for a malicious or unknown return: %s', (path) => {
    expect(getSafeMasterLoginReturnPath(path)).toBe('/spokedu-lab/dashboard');
  });

  it.each([
    '/spokedu-lab/onboarding',
    '/spokedu-lab/onboarding/',
    '/spokedu-lab/onboarding///?next=%2Fspokedu-lab%2Flibrary',
    '/spokedu-master/onboarding',
    '/spokedu-master/onboarding/?source=legacy',
  ])('normalizes an onboarding self-return to the LAB dashboard: %s', (path) => {
    expect(getSafeMasterLoginReturnPath(path)).toBe('/spokedu-lab/dashboard');
  });

  it('strips payment secrets but preserves a valid selected plan on payment routes', () => {
    expect(getSafeMasterLoginReturnPath(
      '/spokedu-master/payment/success?paymentKey=pk&orderId=order&authKey=auth&customerKey=customer&plan=premium&q=safe',
    )).toBe('/spokedu-master/payment/success?plan=premium&q=safe');
  });

  it.each([
    ['/spokedu-lab/payment?plan=premium', '/spokedu-lab/payment?plan=premium'],
    ['/spokedu-lab/payment?plan=lite', '/spokedu-lab/payment?plan=lite'],
    ['/spokedu-master/payment/cancel?plan=premium', '/spokedu-master/payment/cancel?plan=premium'],
    ['/spokedu-master/payment/success?plan=lite', '/spokedu-master/payment/success?plan=lite'],
  ])('preserves an allowlisted plan through a payment return: %s', (path, expected) => {
    expect(getSafeMasterLoginReturnPath(path)).toBe(expected);
  });

  it.each([
    '/spokedu-lab/payment?plan=enterprise',
    '/spokedu-lab/payment?plan=Premium',
    '/spokedu-lab/payment?plan=premium&plan=lite',
    '/spokedu-lab/payment/history?plan=premium',
  ])('removes an invalid or ambiguous payment plan so the payment page uses its safe default: %s', (path) => {
    expect(getSafeMasterLoginReturnPath(path)).toBe(path.replace(/\?plan=.*$/, ''));
  });

  it('removes commercial plan input from non-payment deep-links while preserving their context', () => {
    expect(getSafeMasterLoginReturnPath(
      '/spokedu-lab/library?plan=premium&source=login&q=%EB%86%8D%EA%B5%AC',
    )).toBe('/spokedu-lab/library?source=login&q=%EB%86%8D%EA%B5%AC');
  });

  it('preserves a LAB alias deep-link and uses the LAB login address', () => {
    const path = '/spokedu-lab/library?source=home';
    expect(getSafeMasterLoginReturnPath(path)).toBe(path);
    expect(buildMasterLoginHref(path)).toBe(
      '/spokedu-lab/login?next=%2Fspokedu-lab%2Flibrary%3Fsource%3Dhome',
    );
  });

  it('preserves the requested LAB library destination through incomplete and completed entry', () => {
    const next = '/spokedu-lab/library?source=login';
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: false, isAdmin: false },
      next,
    )).toBe('/spokedu-lab/onboarding?next=%2Fspokedu-lab%2Flibrary%3Fsource%3Dlogin');
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: true, isAdmin: false },
      next,
    )).toBe(next);
  });

  it.each(['premium', 'lite'] as const)(
    'preserves the selected %s plan through login and onboarding entry',
    (plan) => {
      const next = `/spokedu-lab/payment?plan=${plan}&intent=open_library&next=%2Fspokedu-lab%2Flibrary`;
      expect(buildMasterLoginHref(next)).toBe(
        `/spokedu-lab/login?next=${encodeURIComponent(next)}`,
      );
      expect(resolveMasterEntryDestination(
        { authenticated: true, onboardingDone: false, isAdmin: false },
        next,
      )).toBe(`/spokedu-lab/onboarding?next=${encodeURIComponent(next)}`);
      expect(resolveMasterEntryDestination(
        { authenticated: true, onboardingDone: true, isAdmin: false },
        next,
      )).toBe(next);
    },
  );

  it('returns to promotion redemption without carrying its one-time token through login', () => {
    const path = '/spokedu-lab/promotions/redeem?token=one-time-secret';
    expect(getSafeMasterLoginReturnPath(path)).toBe('/spokedu-lab/promotions/redeem');
    expect(buildMasterLoginHref(path)).toBe(
      '/spokedu-lab/login?next=%2Fspokedu-lab%2Fpromotions%2Fredeem',
    );
  });
});

describe('SPOKEDU MASTER server-validated entry destination', () => {
  it('keeps an anonymous user on login and requests local session cleanup', () => {
    expect(resolveMasterEntryAccess(401, null, '/spokedu-master/dashboard')).toEqual({
      destination: null,
      clearBrowserSession: true,
    });
  });

  it('treats a stale browser session rejected by the server as logged out', () => {
    expect(resolveMasterEntryAccess(
      401,
      { authenticated: true, onboardingDone: true, isAdmin: false },
      '/spokedu-master/dashboard',
    )).toEqual({ destination: null, clearBrowserSession: true });
  });

  it('sends an authenticated incomplete user to onboarding with the safe next path', () => {
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: false, isAdmin: false },
      '/spokedu-master/library?source=login',
    )).toBe('/spokedu-master/onboarding?next=%2Fspokedu-master%2Flibrary%3Fsource%3Dlogin');
  });

  it('keeps an incomplete LAB user inside the LAB alias during onboarding', () => {
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: false, isAdmin: false },
      '/spokedu-lab/dashboard',
    )).toBe('/spokedu-lab/onboarding?next=%2Fspokedu-lab%2Fdashboard');
  });

  it.each([
    ['completed user', false],
    ['admin session', true],
  ])('sends an authenticated %s to the requested destination', (_label, isAdmin) => {
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: true, isAdmin },
      '/spokedu-master/dashboard',
    )).toBe('/spokedu-master/dashboard');
  });

  it('keeps the safe-return contract when access is authenticated', () => {
    expect(resolveMasterEntryDestination(
      { authenticated: true, onboardingDone: true, isAdmin: false },
      'https://evil.example/steal',
    )).toBe('/spokedu-lab/dashboard');
  });

  it('does not redirect on a transient server access failure', () => {
    expect(resolveMasterEntryAccess(500, null, '/spokedu-master/dashboard')).toEqual({
      destination: null,
      clearBrowserSession: false,
    });
  });

  it.each(['expired', 'cancelled'])('returns an authenticated %s user before entitlement gating', () => {
    expect(resolveMasterEntryAccess(
      200,
      { authenticated: true, onboardingDone: true, isAdmin: false },
      '/spokedu-master/profile',
    )).toEqual({ destination: '/spokedu-master/profile', clearBrowserSession: false });
  });
});
