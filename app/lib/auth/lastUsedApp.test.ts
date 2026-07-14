import { describe, expect, it, beforeEach } from 'vitest';
import {
  inferLastUsedAppFromPath,
  readLastUsedApp,
  rememberLastUsedApp,
  rememberLastUsedAppFromPath,
  resolveDefaultHomeForLastUsedApp,
} from './lastUsedApp';

describe('lastUsedApp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('infers app family from pathname', () => {
    expect(inferLastUsedAppFromPath('/spokedu-master/dashboard')).toBe('master');
    expect(inferLastUsedAppFromPath('/teacher/my-classes')).toBe('teacher');
    expect(inferLastUsedAppFromPath('/admin/classes-v2/calendar')).toBe('admin');
    expect(inferLastUsedAppFromPath('/login')).toBeNull();
  });

  it('persists last used app in localStorage', () => {
    rememberLastUsedAppFromPath('/spokedu-master/payment');
    expect(readLastUsedApp()).toBe('master');
  });

  it('resolves default home from last used app for non-admin users', () => {
    rememberLastUsedApp('master');
    expect(resolveDefaultHomeForLastUsedApp(readLastUsedApp(), false)).toBe('/spokedu-master');
    expect(resolveDefaultHomeForLastUsedApp(readLastUsedApp(), true)).toBe('/admin');
  });

  it('falls back to teacher home when last used app was teacher', () => {
    rememberLastUsedApp('teacher');
    expect(resolveDefaultHomeForLastUsedApp(readLastUsedApp(), false)).toBe('/teacher/my-classes');
  });
});
