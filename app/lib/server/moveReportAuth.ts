import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export type MoveReportTrackRole = 'admin' | 'instructor' | 'viewer';

export type MoveReportTrackAuthOk = {
  ok: true;
  userId: string;
  email: string | null;
  role: MoveReportTrackRole;
  isAdmin: boolean;
};

export type MoveReportTrackAuthFail = { ok: false; response: NextResponse };

export type MoveReportTrackAuthResult = MoveReportTrackAuthOk | MoveReportTrackAuthFail;

/** Field Capture — instructor or admin only (no viewer writes) */
export async function requireMoveReportTrackInstructor(): Promise<MoveReportTrackAuthResult> {
  const auth = await requireMoveReportTrackSession();
  if (!auth.ok) return auth;
  if (auth.role === 'viewer') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'refresh_token_not_found'
    || String(candidate.message ?? '').toLowerCase().includes('invalid refresh token');
}

async function unauthorized(clear = false): Promise<NextResponse> {
  const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!clear) return res;
  return res;
}

/**
 * MOVE TRACK session — authenticated user with admin, instructor, or approved viewer role.
 */
export async function requireMoveReportTrackSession(): Promise<MoveReportTrackAuthResult> {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user }, error } = await serverSupabase.auth.getUser();
    if (!user) {
      return { ok: false, response: await unauthorized(isInvalidRefreshTokenError(error)) };
    }

    const isAdmin = await isPlatformAdminUser(user, serverSupabase);
    if (isAdmin) {
      return { ok: true, userId: user.id, email: user.email ?? null, role: 'admin', isAdmin: true };
    }

    const service = getServiceSupabase();

    const { count: instructorCount } = await service
      .from('mr_program_instructors')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((instructorCount ?? 0) > 0) {
      return { ok: true, userId: user.id, email: user.email ?? null, role: 'instructor', isAdmin: false };
    }

    const { count: viewerCount } = await service
      .from('mr_program_viewers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('impact_report_approved', true);

    if ((viewerCount ?? 0) > 0) {
      return { ok: true, userId: user.id, email: user.email ?? null, role: 'viewer', isAdmin: false };
    }

    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  } catch (err) {
    devLogger.error('[requireMoveReportTrackSession]', err);
    return { ok: false, response: NextResponse.json({ error: 'Server error' }, { status: 500 }) };
  }
}

export async function canAccessProgram(
  userId: string,
  programId: string,
  opts: { isAdmin: boolean; allowViewer?: boolean },
): Promise<boolean> {
  if (opts.isAdmin) return true;
  const service = getServiceSupabase();

  const { count: ic } = await service
    .from('mr_program_instructors')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('user_id', userId);
  if ((ic ?? 0) > 0) return true;

  if (opts.allowViewer !== false) {
    const { count: vc } = await service
      .from('mr_program_viewers')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('user_id', userId)
      .eq('impact_report_approved', true);
    if ((vc ?? 0) > 0) return true;
  }

  return false;
}

/** VIEWER-safe child row — never includes child_name */
export type MoveReportChildImpactSafe = {
  id: string;
  child_code: string;
  birth_year: number | null;
  grade: string | null;
  child_track: string;
};

export function mapChildForRole(
  row: Record<string, unknown>,
  role: MoveReportTrackRole,
): MoveReportChildImpactSafe | Record<string, unknown> {
  if (role === 'viewer') {
    return {
      id: String(row.id),
      child_code: String(row.child_code),
      birth_year: (row.birth_year as number | null) ?? null,
      grade: (row.grade as string | null) ?? null,
      child_track: String(row.child_track),
    };
  }
  return row;
}
