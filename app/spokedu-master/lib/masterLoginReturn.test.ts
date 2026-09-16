import { describe, expect, it } from 'vitest';

import { resolveMasterEntryAccess, resolveMasterEntryDestination } from './masterLoginReturn';

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
    )).toBe('/spokedu-master/dashboard');
  });

  it('does not redirect on a transient server access failure', () => {
    expect(resolveMasterEntryAccess(500, null, '/spokedu-master/dashboard')).toEqual({
      destination: null,
      clearBrowserSession: false,
    });
  });
});
