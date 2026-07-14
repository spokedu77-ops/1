import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isKnownPlatformAdminEmail,
  isPlatformAdminIdentity,
} from '@/app/lib/auth/platformAdminIdentity';
import {
  readLastUsedApp,
  resolveDefaultHomeForLastUsedApp,
} from '@/app/lib/auth/lastUsedApp';

type AdminCheckResponse = {
  admin?: boolean;
  reason?: 'no-session' | 'forbidden' | 'server-error';
};

async function checkAdminFromClientTables(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  if (isKnownPlatformAdminEmail(email)) return true;

  const [{ data: profile }, { data: userRow }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('users').select('role, is_admin, name').eq('id', userId).maybeSingle(),
  ]);

  return isPlatformAdminIdentity(email, userRow, profile?.role);
}

export async function fetchPlatformAdminStatus(
  supabase?: SupabaseClient,
  user?: { id: string; email?: string | null },
): Promise<boolean> {
  if (supabase) {
    await supabase.auth.getSession();
  }

  try {
    const res = await fetch('/api/auth/check-admin', { credentials: 'include' });
    const json = (await res.json()) as AdminCheckResponse;
    if (json.admin) return true;
  } catch {
    // API 실패 시 클라이언트 테이블 조회로 fallback
  }

  if (supabase && user?.id) {
    return checkAdminFromClientTables(supabase, user.id, user.email);
  }

  return isKnownPlatformAdminEmail(user?.email);
}

export async function resolvePostLoginRedirect(
  nextSafe: string | null,
  supabase?: SupabaseClient,
  user?: { id: string; email?: string | null },
): Promise<string> {
  const isAdmin = await fetchPlatformAdminStatus(supabase, user);
  if (nextSafe && !isAdmin) return nextSafe;
  if (nextSafe && isAdmin && nextSafe.startsWith('/teacher')) {
    return '/admin';
  }
  if (nextSafe) return nextSafe;

  const lastUsedHome = resolveDefaultHomeForLastUsedApp(readLastUsedApp(), isAdmin);
  if (lastUsedHome) return lastUsedHome;

  return isAdmin ? '/admin' : '/teacher/my-classes';
}
