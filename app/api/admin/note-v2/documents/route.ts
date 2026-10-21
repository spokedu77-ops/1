import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const TABLE = 'spokedu_note_v2_documents';
const DOC_SELECT = 'id,title,content_version,updated_at';

// Explicit cache prevention: there must never be an HTTP-stale editing base version.
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await getServiceSupabase()
      .from(TABLE).select(DOC_SELECT).is('deleted_at', null)
      .order('updated_at', { ascending: false }).limit(20);
    if (error) return NextResponse.json({ error: 'DATABASE_NOT_READY' }, { status: 503, headers: HEADERS });
    return NextResponse.json({ documents: data ?? [] }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503, headers: HEADERS });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  // Prevent cross-origin browser form/subresource writes. Auth cookie alone isn't a CSRF defense.
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'ORIGIN_REJECTED' }, { status: 403, headers: HEADERS });
  }
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const title = typeof input.title === 'string' ? input.title.trim() : '새 노트';
    if (title.length < 1 || title.length > 200) {
      return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400, headers: HEADERS });
    }
    const { data, error } = await getServiceSupabase().from(TABLE)
      .insert({
        title,
        content: [{ type: 'paragraph', content: [] }],
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('id,title,content,content_version,updated_at').single();
    if (error || !data) return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 503, headers: HEADERS });
    return NextResponse.json({ document: data }, { status: 201, headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 503, headers: HEADERS });
  }
}
