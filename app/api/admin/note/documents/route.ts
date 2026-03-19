import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  parent_id: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseOffset(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function slugifyTitle(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parsePositiveInt(searchParams.get('limit'), 200, 500);
    const offset = parseOffset(searchParams.get('offset'));
    const parentId = searchParams.get('parentId');
    const backlinksFor = searchParams.get('backlinksFor');

    const supabase = getServiceSupabase();
    if (backlinksFor) {
      const { data: targetDoc, error: targetError } = await supabase
        .from('note_documents')
        .select('id, title')
        .eq('id', backlinksFor)
        .maybeSingle();
      if (targetError) {
        devLogger.error('[admin/note/documents] GET backlinks target error', targetError);
        return NextResponse.json({ error: targetError.message }, { status: 500 });
      }
      const targetTitle = (targetDoc?.title ?? '').trim();
      if (!targetTitle) {
        return NextResponse.json({ backlinks: [] as NoteDocument[] });
      }

      const escapedTitle = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const backlinkPattern = `%[[${escapedTitle}]]%`;
      const { data: backlinkBlocks, error: backlinkBlocksError } = await supabase
        .from('note_blocks')
        .select('document_id')
        .ilike('content->>text', backlinkPattern)
        .limit(300);
      if (backlinkBlocksError) {
        devLogger.error('[admin/note/documents] GET backlinks blocks error', backlinkBlocksError);
        return NextResponse.json({ error: backlinkBlocksError.message }, { status: 500 });
      }

      const sourceDocIds = [...new Set((backlinkBlocks ?? []).map((b) => b.document_id).filter((id) => id && id !== backlinksFor))];
      if (sourceDocIds.length === 0) {
        return NextResponse.json({ backlinks: [] as NoteDocument[] });
      }

      const { data: sourceDocs, error: sourceDocsError } = await supabase
        .from('note_documents')
        .select('id, title, is_archived, is_favorite, parent_id, slug, created_at, updated_at')
        .in('id', sourceDocIds)
        .order('updated_at', { ascending: false });
      if (sourceDocsError) {
        devLogger.error('[admin/note/documents] GET backlinks docs error', sourceDocsError);
        return NextResponse.json({ error: sourceDocsError.message }, { status: 500 });
      }

      return NextResponse.json({ backlinks: (sourceDocs ?? []) as NoteDocument[] });
    }

    const query = supabase
      .from('note_documents')
      .select('id, title, is_archived, is_favorite, parent_id, slug, created_at, updated_at')
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query.eq('is_archived', false);
    }
    if (parentId === 'null') {
      query.is('parent_id', null);
    } else if (parentId) {
      query.eq('parent_id', parentId);
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
    const parentId = typeof body.parent_id === 'string' ? body.parent_id : null;
    const slug = typeof body.slug === 'string' && body.slug.trim().length > 0
      ? slugifyTitle(body.slug)
      : slugifyTitle(title);

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('note_documents')
      .insert({
        title,
        is_archived: false,
        is_favorite: false,
        parent_id: parentId,
        slug,
        created_at: now,
        updated_at: now,
        created_by: auth.ok ? auth.userId : null,
        updated_by: auth.ok ? auth.userId : null,
      })
      .select('id, title, is_archived, is_favorite, parent_id, slug, created_at, updated_at')
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
      if (typeof body.slug !== 'string') {
        updates.slug = slugifyTitle(t.length > 0 ? t : 'Untitled');
      }
    }
    if (typeof body.is_archived === 'boolean') {
      updates.is_archived = body.is_archived;
    }
    if (typeof body.is_favorite === 'boolean') {
      updates.is_favorite = body.is_favorite;
    }
    if (body.parent_id === null || typeof body.parent_id === 'string') {
      updates.parent_id = body.parent_id;
    }
    if (typeof body.slug === 'string') {
      updates.slug = slugifyTitle(body.slug);
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
      .select('id, title, is_archived, is_favorite, parent_id, slug, created_at, updated_at')
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

