import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isNoteV2Id } from '@/app/lib/note-v2/contract';

const TABLE = 'spokedu_note_v2_documents';
const FIELDS = 'id,title,parent_id,position,created_at,updated_at,deleted_at';
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
const BATCH = 500;
const MAX_ROWS = 10000;

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const db = getServiceSupabase();
    const documents: unknown[] = [];
    for (let offset = 0; offset <= MAX_ROWS; offset += BATCH) {
      const { data, error } = await db.from(TABLE).select(FIELDS)
        .order('created_at', { ascending: true }).order('id', { ascending: true })
        .range(offset, offset + BATCH - 1);
      if (error) throw new Error('TREE_READ_FAILED');
      if (!data?.length) break;
      documents.push(...data);
      if (documents.length > MAX_ROWS) return NextResponse.json({ error: 'TREE_CAPACITY_EXCEEDED' }, { status: 507, headers: HEADERS });
      if (data.length < BATCH) break;
    }
    return NextResponse.json({ documents }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'TREE_READ_FAILED' }, { status: 503, headers: HEADERS });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'ORIGIN_REJECTED' }, { status: 403, headers: HEADERS });
  const text = await request.text().catch(() => '');
  if (!text || new TextEncoder().encode(text).length > 8192) return NextResponse.json({ error: 'INVALID_PAYLOAD_SIZE' }, { status: 413, headers: HEADERS });
  let input: unknown;
  try { input = JSON.parse(text); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: HEADERS }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400, headers: HEADERS });
  const body = input as Record<string, unknown>;
  if (body.parent_id !== null && body.parent_id !== undefined && !isNoteV2Id(body.parent_id)) {
    return NextResponse.json({ error: 'INVALID_PARENT_ID' }, { status: 400, headers: HEADERS });
  }
  const parentId = typeof body.parent_id === 'string' ? body.parent_id : null;
  const title = typeof body.title === 'string' ? body.title.trim() : '새 페이지';
  if (!title || title.length > 200) return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400, headers: HEADERS });
  try {
    const db = getServiceSupabase();
    if (parentId) {
      // A live child of a trashed ancestor is also hidden. Do not create invisible pages.
      let ancestor: string | null = parentId;
      const seen = new Set<string>();
      while (ancestor) {
        if (seen.has(ancestor) || seen.size >= 128) {
          return NextResponse.json({ error: 'INVALID_PARENT_CHAIN' }, { status: 409, headers: HEADERS });
        }
        seen.add(ancestor);
        const { data, error }: {
          data: {
            id: string;
            parent_id: string | null;
            deleted_at: string | null;
          } | null;
          error: { message: string } | null;
        } = await db.from(TABLE)
          .select('id,parent_id,deleted_at').eq('id', ancestor).maybeSingle();
        const parent: {
          id: string;
          parent_id: string | null;
          deleted_at: string | null;
        } | null = data;
        if (error) throw new Error('PARENT_LOOKUP_FAILED');
        if (!parent || parent.deleted_at) {
          return NextResponse.json({ error: 'PARENT_NOT_AVAILABLE' }, { status: 409, headers: HEADERS });
        }
        ancestor = parent.parent_id;
      }
    }
    let siblings = db.from(TABLE).select('position').is('deleted_at', null);
    siblings = parentId ? siblings.eq('parent_id', parentId) : siblings.is('parent_id', null);
    const { data: last, error: siblingError } = await siblings.order('position', { ascending: false }).limit(1);
    if (siblingError) throw new Error('SIBLING_LOOKUP_FAILED');
    const max = last?.[0]?.position;
    const position = typeof max === 'number' ? max + 1024 : 0;
    if (!Number.isSafeInteger(position) || position > 2147483647) {
      return NextResponse.json({ error: 'POSITION_CAPACITY_EXCEEDED' }, { status: 409, headers: HEADERS });
    }
    const { data, error } = await db.from(TABLE).insert({
      title, parent_id: parentId, position,
      content: [{ type: 'paragraph', content: [] }], created_by: auth.userId, updated_by: auth.userId,
    }).select('id,title,parent_id,position,created_at,updated_at,deleted_at').single();
    if (error || !data) throw new Error('PAGE_CREATE_FAILED');
    return NextResponse.json({ document: data }, { status: 201, headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'PAGE_CREATE_FAILED' }, { status: 503, headers: HEADERS });
  }
}
