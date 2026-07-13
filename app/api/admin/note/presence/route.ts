import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  isKnownPlatformAdminEmail,
  isPlatformAdminFromProfileRole,
  isPlatformAdminFromUserRow,
} from '@/app/lib/auth/platformAdminIdentity';

/** "최근 열람" — 이 기간 밖 기록은 집계·표시하지 않음 */
const RECENT_PRESENCE_MS = 7 * 24 * 60 * 60 * 1000;

type NoteCollaboratorRow = {
  id: string;
  document_id: string;
  user_id: string;
  last_active_at: string;
  last_cursor: unknown;
};

export type NoteCollaboratorResponse = NoteCollaboratorRow & {
  display_name: string | null;
};

function recentPresenceCutoffIso(): string {
  return new Date(Date.now() - RECENT_PRESENCE_MS).toISOString();
}

async function fetchRecentCollaboratorRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  documentId: string,
) {
  return supabase
    .from('note_collaborators')
    .select('id, document_id, user_id, last_active_at, last_cursor')
    .eq('document_id', documentId)
    .gte('last_active_at', recentPresenceCutoffIso())
    .order('last_active_at', { ascending: false });
}

async function resolvePlatformAdminCollaborators(
  supabase: ReturnType<typeof getServiceSupabase>,
  rows: NoteCollaboratorRow[],
): Promise<NoteCollaboratorResponse[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: userRows, error: usersError } = await supabase
    .from('users')
    .select('id, role, is_admin, name, email')
    .in('id', userIds);
  if (usersError) throw new Error(usersError.message);

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, role')
    .in('id', userIds);
  if (profilesError) throw new Error(profilesError.message);

  const userById = new Map(
    (userRows ?? []).map((row) => [String(row.id), row as {
      id: string;
      role?: string | null;
      is_admin?: boolean | null;
      name?: string | null;
      email?: string | null;
    }]),
  );
  const profileRoleById = new Map(
    (profileRows ?? []).map((row) => [String(row.id), (row as { role?: string | null }).role]),
  );

  const results: NoteCollaboratorResponse[] = [];
  for (const row of rows) {
    const user = userById.get(row.user_id);
    const profileRole = profileRoleById.get(row.user_id);
    const isAdmin = isKnownPlatformAdminEmail(user?.email)
      || isPlatformAdminFromUserRow(user ?? null)
      || isPlatformAdminFromProfileRole(profileRole);
    if (!isAdmin) continue;

    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    results.push({
      ...row,
      display_name: name.length > 0 ? name : null,
    });
  }
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await fetchRecentCollaboratorRows(supabase, documentId);

    if (error) {
      devLogger.error('[admin/note/presence] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const collaborators = await resolvePlatformAdminCollaborators(
      supabase,
      (data ?? []) as NoteCollaboratorRow[],
    );

    return NextResponse.json({ collaborators });
  } catch (err) {
    devLogger.error('[admin/note/presence] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const documentId = typeof body.documentId === 'string' ? body.documentId : null;
    const lastCursor = body.lastCursor ?? null;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_collaborators')
      .upsert(
        {
          document_id: documentId,
          user_id: auth.userId,
          last_active_at: now,
          last_cursor: lastCursor,
        },
        { onConflict: 'document_id, user_id' },
      )
      .select('id, document_id, user_id, last_active_at, last_cursor')
      .single();

    if (error) {
      devLogger.error('[admin/note/presence] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: collaboratorRows, error: collaboratorsError } = await fetchRecentCollaboratorRows(
      supabase,
      documentId,
    );
    if (collaboratorsError) {
      devLogger.error('[admin/note/presence] POST collaborators fetch error', collaboratorsError);
      return NextResponse.json({ error: collaboratorsError.message }, { status: 500 });
    }

    const collaborators = await resolvePlatformAdminCollaborators(
      supabase,
      (collaboratorRows ?? []) as NoteCollaboratorRow[],
    );

    const selfRow = (data ?? null) as NoteCollaboratorRow | null;
    const collaborator = selfRow
      ? collaborators.find((row) => row.user_id === selfRow.user_id) ?? {
        ...selfRow,
        display_name: null,
      }
      : null;

    return NextResponse.json({
      collaborator,
      collaborators,
    });
  } catch (err) {
    devLogger.error('[admin/note/presence] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
