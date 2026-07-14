import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applyLoginSessionPreference,
  clearLoginSessionMarkers,
  enforceSessionOnlyPolicy,
  readKeepLoggedInPreference,
  registerEphemeralBrowserSession,
} from './sessionPersistence';

describe('sessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults keep-logged-in preference to true', () => {
    expect(readKeepLoggedInPreference()).toBe(true);
  });

  it('stores ephemeral browser session markers when keep logged in is off', () => {
    applyLoginSessionPreference(false);
    expect(localStorage.getItem('spokedu:keep-logged-in')).toBe('0');
    expect(localStorage.getItem('spokedu:ephemeral-session-active')).toBe('1');
    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBe('1');
    expect(sessionStorage.getItem('spokedu:tab-registered')).toBe('1');
  });

  it('clears ephemeral markers when keep logged in is on', () => {
    applyLoginSessionPreference(false);
    applyLoginSessionPreference(true);
    expect(localStorage.getItem('spokedu:keep-logged-in')).toBe('1');
    expect(localStorage.getItem('spokedu:ephemeral-session-active')).toBeNull();
    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBeNull();
  });

  it('signs out when session-only preference is set and browser session marker is missing', async () => {
    localStorage.setItem('spokedu:keep-logged-in', '0');
    const signOut = vi.fn().mockResolvedValue(undefined);

    await expect(enforceSessionOnlyPolicy(signOut)).resolves.toBe(true);
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('keeps session when ephemeral browser session marker is active (shared across tabs)', async () => {
    localStorage.setItem('spokedu:keep-logged-in', '0');
    localStorage.setItem('spokedu:ephemeral-session-active', '1');
    const signOut = vi.fn().mockResolvedValue(undefined);

    await expect(enforceSessionOnlyPolicy(signOut)).resolves.toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('registers a second tab without requiring a per-tab sessionStorage marker', () => {
    localStorage.setItem('spokedu:keep-logged-in', '0');
    localStorage.setItem('spokedu:ephemeral-session-active', '1');
    localStorage.setItem('spokedu:ephemeral-tab-count', '1');

    const cleanup = registerEphemeralBrowserSession();

    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBe('2');
    expect(sessionStorage.getItem('spokedu:tab-registered')).toBe('1');

    cleanup();
    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBe('1');
    expect(localStorage.getItem('spokedu:ephemeral-session-active')).toBe('1');
  });

  it('clears ephemeral markers when the last tab closes', () => {
    localStorage.setItem('spokedu:keep-logged-in', '0');
    localStorage.setItem('spokedu:ephemeral-session-active', '1');
    localStorage.setItem('spokedu:ephemeral-tab-count', '1');
    sessionStorage.setItem('spokedu:tab-registered', '1');

    const cleanup = registerEphemeralBrowserSession();
    cleanup();

    expect(localStorage.getItem('spokedu:ephemeral-session-active')).toBeNull();
    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBeNull();
    expect(sessionStorage.getItem('spokedu:tab-registered')).toBeNull();
  });

  it('clears session markers on logout cleanup', () => {
    applyLoginSessionPreference(false);
    clearLoginSessionMarkers();
    expect(localStorage.getItem('spokedu:ephemeral-session-active')).toBeNull();
    expect(localStorage.getItem('spokedu:ephemeral-tab-count')).toBeNull();
    expect(sessionStorage.getItem('spokedu:tab-registered')).toBeNull();
  });
});
