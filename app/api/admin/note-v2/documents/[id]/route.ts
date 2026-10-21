import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isNoteV2Id, isSafeVersion, validateNoteV2Content } from '@/app/lib/note-v2/contract';

const TABLE = 'spokedu_note_v2_documents';
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!isNoteV2Id(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400, headers: HEADERS });
  try {
    const { data, error } = await getServiceSupabase()
      .from(TABLE).select('id,title,content,content_version,updated_at')
      .eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) return NextResponse.json({ error: 'READ_FAILED' }, { status: 503, headers: HEADERS });
    if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers: HEADERS });
    return NextResponse.json({ document: data }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'READ_FAILED' }, { status: 503, headers: HEADERS });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!isNoteV2Id(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400, headers: HEADERS });
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'ORIGIN_REJECTED' }, { status: 403, headers: HEADERS });
  }
  // Bound request before parsing. Clients must not upload arbitrarily large snapshots.
  const raw = await request.text().catch(() => '');
  if (!raw || new TextEncoder().encode(raw).length > 512 * 1024) {
    return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE_OR_EMPTY' }, { status: 413, headers: HEADERS });
  }
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: HEADERS });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400, headers: HEADERS });
  }
  const body = payload as Record<string, unknown>;
  if (!isSafeVersion(body.baseVersion)) {
    return NextResponse.json({ error: 'INVALID_VERSION' }, { status: 400, headers: HEADERS });
  }
  const content = validateNoteV2Content(body.content);
  if (!content.ok) {
    return NextResponse.json({ error: content.error }, { status: 400, headers: HEADERS });
  }

  try {
    const { data, error } = await getServiceSupabase().from(TABLE)
      .update({
        content: content.content,
        content_version: body.baseVersion + 1,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      })
      .eq('id', id)
      .eq('content_version', body.baseVersion)
      .is('deleted_at', null)
      .select('id,content_version,updated_at')
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 503, headers: HEADERS });
    // This is NOT a lost write: conditional UPDATE only succeeds for one version.
    // For Stage 3, do not automatically merge or overwrite on conflict.
    if (!data) return NextResponse.json({ error: 'VERSION_CONFLICT_OR_MISSING' }, { status: 409, headers: HEADERS });
    return NextResponse.json({ saved: true, version: data.content_version, updated_at: data.updated_at }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 503, headers: HEADERS });
  }
}
