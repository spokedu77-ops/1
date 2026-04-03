import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  is_pinned: boolean;
  parent_id: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInt(searchParams.get('limit'), 200, 500);
    const offset = parseOffset(searchParams.get('offset'));

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('note_documents')
      .select('id, title, is_archived, is_favorite, is_pinned, parent_id, slug, created_at, updated_at, deleted_at, deleted_by')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      devLogger.error('[admin/note/trash] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: (data ?? []) as NoteDocument[], limit, offset });
  } catch (err) {
    devLogger.error('[admin/note/trash] GET exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

