import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const supabase = getServiceSupabase();
    const query = supabase
      .from('note_documents')
      .select('id, title, is_archived, is_favorite, created_at, updated_at')
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!includeArchived) {
      query.eq('is_archived', false);
    }

    const { data, error } = await query;
    if (error) {
      devLogger.error('[admin/note/documents] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: (data ?? []) as NoteDocument[] });
  } catch (err) {
    devLogger.error('[admin/note/documents] GET exception', err);
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
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const title = rawTitle.length > 0 ? rawTitle : 'Untitled';

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_documents')
      .insert({
        title,
        is_archived: false,
        is_favorite: false,
        created_at: now,
        updated_at: now,
        created_by: auth.ok ? auth.userId : null,
        updated_by: auth.ok ? auth.userId : null,
      })
      .select('id, title, is_archived, is_favorite, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/documents] POST error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data as NoteDocument });
  } catch (err) {
    devLogger.error('[admin/note/documents] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      updates.title = t.length > 0 ? t : 'Untitled';
    }
    if (typeof body.is_archived === 'boolean') {
      updates.is_archived = body.is_archived;
    }
    if (typeof body.is_favorite === 'boolean') {
      updates.is_favorite = body.is_favorite;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_documents')
      .update({
        ...updates,
        updated_at: now,
        updated_by: auth.userId,
      })
      .eq('id', id)
      .select('id, title, is_archived, is_favorite, created_at, updated_at')
      .single();

    if (error) {
      devLogger.error('[admin/note/documents] PATCH error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data as NoteDocument });
  } catch (err) {
    devLogger.error('[admin/note/documents] PATCH exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('note_documents').delete().eq('id', id);

    if (error) {
      devLogger.error('[admin/note/documents] DELETE error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[admin/note/documents] DELETE exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

