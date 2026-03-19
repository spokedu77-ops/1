import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteCollaborator = {
  id: string;
  document_id: string;
  user_id: string;
  last_active_at: string;
  last_cursor: unknown;
};

async function fetchCollaborators(supabase: ReturnType<typeof getServiceSupabase>, documentId: string) {
  return supabase
    .from('note_collaborators')
    .select('id, document_id, user_id, last_active_at, last_cursor')
    .eq('document_id', documentId)
    .order('last_active_at', { ascending: false });
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
    const { data, error } = await fetchCollaborators(supabase, documentId);

    if (error) {
      devLogger.error('[admin/note/presence] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collaborators: (data ?? []) as NoteCollaborator[] });
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

    const { data: collaborators, error: collaboratorsError } = await fetchCollaborators(supabase, documentId);
    if (collaboratorsError) {
      devLogger.error('[admin/note/presence] POST collaborators fetch error', collaboratorsError);
      return NextResponse.json({ error: collaboratorsError.message }, { status: 500 });
    }

    return NextResponse.json({
      collaborator: data as NoteCollaborator,
      collaborators: (collaborators ?? []) as NoteCollaborator[],
    });
  } catch (err) {
    devLogger.error('[admin/note/presence] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

