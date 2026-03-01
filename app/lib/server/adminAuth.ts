/**
 * 서버 전용 관리자 인증 유틸리티
 *
 * 모든 admin API 라우트는 반드시 이 파일의 requireAdmin()을 사용해야 합니다.
 * 직접 supabase.auth.getUser() / getSession()을 API 라우트 안에서 구현하지 마세요.
 *
 * 관리자 판단 기준 (순서대로):
 *   1. users.role = 'admin' | 'master'
 *   2. users.is_admin = true
 *   3. users.name이 ADMIN_NAMES에 포함
 *   4. profiles.role = 'admin' | 'master'  (fallback)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { ADMIN_NAMES, ROLES } from '@/app/lib/constants/admin';

// ─── 결과 타입 ────────────────────────────────────────────────────────────────

export type AdminAuthOk = { ok: true; userId: string };
export type AdminAuthFail = { ok: false; response: NextResponse };
export type AdminAuthResult = AdminAuthOk | AdminAuthFail;

// ─── Service Role 클라이언트 (RLS 우회) ───────────────────────────────────────

/**
 * RLS를 우회하는 Service Role 클라이언트.
 * 데이터 읽기/쓰기에 사용. 반드시 서버 사이드에서만 호출할 것.
 */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role env not set');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ─── 관리자 판별 로직 ──────────────────────────────────────────────────────────

function isAdminRole(role: unknown): boolean {
  if (!role || typeof role !== 'string') return false;
  const lower = role.trim().toLowerCase();
  return lower === ROLES.ADMIN || lower === ROLES.MASTER;
}

// ─── 핵심 함수 ────────────────────────────────────────────────────────────────

/**
 * 현재 요청의 쿠키 세션을 읽어 관리자 여부를 확인합니다.
 *
 * 성공: { ok: true, userId }
 * 실패: { ok: false, response } — response를 그대로 return하면 됩니다.
 *
 * @example
 * export async function GET() {
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *   const supabase = getServiceSupabase();
 *   // ...
 * }
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  try {
    const serverSupabase = await createServerSupabaseClient();

    // getUser: Auth 서버에 검증 요청 (getSession은 쿠키만 읽어 신뢰할 수 없음)
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const uid = user.id;

    // users / profiles 병렬 요청 (fallback 시 두 번째 왕복 제거, 판별 기준 동일)
    const usersPromise = serverSupabase
      .from('users')
      .select('role, is_admin, name')
      .eq('id', uid)
      .maybeSingle();
    const profilesPromise = serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle();

    const { data: userRow } = await usersPromise;
    const u = userRow as { role?: string; is_admin?: boolean; name?: string } | null;

    if (
      u &&
      (isAdminRole(u.role) ||
        u.is_admin === true ||
        (typeof u.name === 'string' && (ADMIN_NAMES as readonly string[]).includes(u.name)))
    ) {
      return { ok: true, userId: uid };
    }

    const { data: profileRow } = await profilesPromise;
    const p = profileRow as { role?: string } | null;
    if (p && isAdminRole(p.role)) {
      return { ok: true, userId: uid };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  } catch (err) {
    console.error('[requireAdmin]', err);
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server error' }, { status: 500 }),
    };
  }
}
