export type LastUsedApp = 'master' | 'teacher' | 'admin';

const LAST_USED_APP_KEY = 'spokedu:last-used-app';

export function inferLastUsedAppFromPath(pathname: string): LastUsedApp | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname === '/spokedu-master' || pathname.startsWith('/spokedu-master/')) return 'master';
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) return 'teacher';
  return null;
}

export function readLastUsedApp(): LastUsedApp | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(LAST_USED_APP_KEY);
    if (value === 'master' || value === 'teacher' || value === 'admin') return value;
    return null;
  } catch {
    return null;
  }
}

export function rememberLastUsedApp(app: LastUsedApp): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_USED_APP_KEY, app);
  } catch {
    // ignore
  }
}

export function rememberLastUsedAppFromPath(pathname: string): void {
  const app = inferLastUsedAppFromPath(pathname);
  if (app) rememberLastUsedApp(app);
}

export function resolveDefaultHomeForLastUsedApp(
  lastApp: LastUsedApp | null,
  isAdmin: boolean,
): string | null {
  if (isAdmin) return '/admin';
  if (lastApp === 'master') return '/spokedu-master';
  if (lastApp === 'teacher') return '/teacher/my-classes';
  return null;
}
