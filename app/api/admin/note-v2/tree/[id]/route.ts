import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isNoteV2Id } from '@/app/lib/note-v2/contract';

const TABLE = 'spokedu_note_v2_documents';
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!isNoteV2Id(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400, headers: HEADERS });
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: 'ORIGIN_REJECTED' }, { status: 403, headers: HEADERS });
  const raw = await request.text().catch(() => '');
  if (!raw || new TextEncoder().encode(raw).length > 8192) return NextResponse.json({ error: 'INVALID_PAYLOAD_SIZE' }, { status: 413, headers: HEADERS });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: HEADERS }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400, headers: HEADERS });
  const body = input as Record<string, unknown>;
  const db = getServiceSupabase();
  const now = new Date().toISOString();
  try {
    if (body.action === 'rename') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const expectedTitle = body.expectedTitle;
      if (!title || title.length > 200 || typeof expectedTitle !== 'string' || !expectedTitle || expectedTitle.length > 200) {
        return NextResponse.json({ error: 'INVALID_TITLE_OR_PRECONDITION' }, { status: 400, headers: HEADERS });
      }
      const { data, error } = await db.from(TABLE)
        .update({ title, updated_at: now, updated_by: auth.userId })
        .eq('id', id).eq('title', expectedTitle).is('deleted_at', null)
        .select('id,title,parent_id,position,created_at,updated_at,deleted_at').maybeSingle();
      if (error) throw new Error('RENAME_FAILED');
      if (!data) return NextResponse.json({ error: 'RENAME_CONFLICT_OR_MISSING' }, { status: 409, headers: HEADERS });
      return NextResponse.json({ document: data }, { headers: HEADERS });
    }
    if (body.action === 'trash') {
      const { data, error } = await db.from(TABLE)
        .update({ deleted_at: now, updated_at: now, updated_by: auth.userId })
        .eq('id', id).is('deleted_at', null)
        .select('id').maybeSingle();
      if (error) throw new Error('TRASH_FAILED');
      if (!data) return NextResponse.json({ error: 'NOT_FOUND_OR_ALREADY_TRASHED' }, { status: 409, headers: HEADERS });
      // Children remain intact; their parent is hidden, not destructively cascaded.
      return NextResponse.json({ ok: true }, { headers: HEADERS });
    }
    if (body.action === 'restore') {
      const { data: row, error: readError } = await db.from(TABLE)
        .select('id,parent_id,deleted_at').eq('id', id).maybeSingle();
      if (readError) throw new Error('RESTORE_READ_FAILED');
      if (!row || !row.deleted_at) return NextResponse.json({ error: 'NOT_IN_TRASH' }, { status: 409, headers: HEADERS });
      let ancestor: string | null = row.parent_id;
      const seen = new Set<string>([id]);
      while (ancestor) {
        if (seen.has(ancestor) || seen.size >= 128) {
          return NextResponse.json({ error: 'INVALID_PARENT_CHAIN' }, { status: 409, headers: HEADERS });
        }
        seen.add(ancestor);
        const { data: parent, error } = await db.from(TABLE)
          .select('id,parent_id,deleted_at').eq('id', ancestor).maybeSingle();
        if (error) throw new Error('RESTORE_PARENT_CHECK_FAILED');
        if (!parent || parent.deleted_at) {
          return NextResponse.json({ error: 'RESTORE_PARENT_FIRST' }, { status: 409, headers: HEADERS });
        }
        ancestor = parent.parent_id;
      }
      const { data, error } = await db.from(TABLE)
        .update({ deleted_at: null, updated_at: now, updated_by: auth.userId })
        .eq('id', id).not('deleted_at', 'is', null).select('id').maybeSingle();
      if (error) throw new Error('RESTORE_FAILED');
      if (!data) return NextResponse.json({ error: 'RESTORE_CONFLICT' }, { status: 409, headers: HEADERS });
      return NextResponse.json({ ok: true }, { headers: HEADERS });
    }
    if (body.action === 'reorder') {
      if (body.direction !== 'up' && body.direction !== 'down') {
        return NextResponse.json({ error: 'INVALID_DIRECTION' }, { status: 400, headers: HEADERS });
      }
      // Atomic in database; no client-side two-step position swaps.
      const { data, error } = await db.rpc('spokedu_note_v2_reorder_sibling_v1', {
        p_document_id: id, p_direction: body.direction, p_actor_id: auth.userId,
      });
      if (error) {
        const code = typeof error.code === 'string' ? error.code : '';
        return NextResponse.json({ error: code === '42883' || code === 'PGRST202' ? 'ORDER_RPC_NOT_INSTALLED' : 'REORDER_FAILED' }, { status: 503, headers: HEADERS });
      }
      return NextResponse.json({ result: data }, { headers: HEADERS });
    }
    return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400, headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'TREE_MUTATION_FAILED' }, { status: 503, headers: HEADERS });
  }
}
