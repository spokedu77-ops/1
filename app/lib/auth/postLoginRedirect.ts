import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import { SPOMOVE_EMAIL } from '@/app/lib/constants/admin';
import {
  readLastUsedApp,
  resolveDefaultHomeForLastUsedApp,
} from '@/app/lib/auth/lastUsedApp';

type AdminCheckResponse = {
  admin?: boolean;
  reason?: 'no-session' | 'forbidden' | 'server-error';
};

export async function fetchPlatformAdminStatus(
  supabase?: SupabaseClient,
  _user?: { id: string; email?: string | null },
): Promise<boolean> {
  // Keep the existing call signature; only the server response decides access.
  void _user;
  if (supabase) {
    await getSessionWithRefreshRecovery(supabase);
  }

  try {
    const res = await fetch('/api/auth/check-admin', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json()) as AdminCheckResponse;
    if (!res.ok) throw new Error('ADMIN_CHECK_UNAVAILABLE');
    if (json.admin) return true;
    // A server rejection must never be overridden by a browser identity fallback.
    if (json.reason === 'no-session') throw new Error('SERVER_SESSION_REQUIRED');
    if (json.reason === 'forbidden') return false;
    throw new Error('ADMIN_CHECK_UNAVAILABLE');
  } catch {
    throw new Error('ADMIN_CHECK_UNAVAILABLE');
  }
}

export async function resolvePostLoginRedirect(
  nextSafe: string | null,
  supabase?: SupabaseClient,
  user?: { id: string; email?: string | null },
): Promise<string> {
  const isAdmin = await fetchPlatformAdminStatus(supabase, user);
  if (isAdmin && user?.email?.trim().toLowerCase() === SPOMOVE_EMAIL) return '/admin/spomove/training';
  if (nextSafe?.startsWith('/admin') && !isAdmin) return '/teacher/my-classes';
  if (nextSafe && !isAdmin) return nextSafe;
  if (nextSafe && isAdmin && nextSafe.startsWith('/teacher')) {
    return '/admin';
  }
  if (nextSafe) return nextSafe;

  const lastUsedHome = resolveDefaultHomeForLastUsedApp(readLastUsedApp(), isAdmin);
  if (lastUsedHome) return lastUsedHome;

  return isAdmin ? '/admin' : '/teacher/my-classes';
}
