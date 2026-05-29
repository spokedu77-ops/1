import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_NAMES, MASTER_EMAIL, ROLES } from '@/app/lib/constants/admin';

type AdminCheckResponse = {
  admin?: boolean;
  reason?: 'no-session' | 'forbidden' | 'server-error';
};

function isAdminRole(role: unknown): boolean {
  if (!role || typeof role !== 'string') return false;
  const lower = role.trim().toLowerCase();
  return lower === ROLES.ADMIN || lower === ROLES.MASTER;
}

async function checkAdminFromClientTables(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const normalizedEmail = email?.toLowerCase() ?? '';
  if (normalizedEmail && normalizedEmail === MASTER_EMAIL.toLowerCase()) {
    return true;
  }

  const [{ data: profile }, { data: userRow }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('users').select('role, is_admin, name').eq('id', userId).maybeSingle(),
  ]);

  if (isAdminRole(profile?.role)) return true;
  if (!userRow) return false;

  if (
    isAdminRole(userRow.role) ||
    userRow.is_admin === true ||
    (typeof userRow.name === 'string' && (ADMIN_NAMES as readonly string[]).includes(userRow.name))
  ) {
    return true;
  }

  return false;
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

  return false;
}

export async function resolvePostLoginRedirect(
  nextSafe: string | null,
  supabase?: SupabaseClient,
  user?: { id: string; email?: string | null },
): Promise<string> {
  if (nextSafe) return nextSafe;
  const isAdmin = await fetchPlatformAdminStatus(supabase, user);
  return isAdmin ? '/admin' : '/teacher/my-classes';
}
