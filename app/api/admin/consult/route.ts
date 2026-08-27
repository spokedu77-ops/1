import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { summarizeLeadRow } from '@/app/lib/admin/leadInboxSummary';

const ALLOWED_STATUS = new Set(['pending', 'done']);

const CONSULT_SELECT =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at, lead_route, lead_context, curriculum_mode, private_start_direction, private_preferred_format, conversion_evidence_slug, source_lead_id';

const CONSULT_SELECT_LEGACY =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at';

type ConsultDbRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content?: string | null;
  consult_type: string;
  status: string;
  created_at: string;
  lead_route?: string | null;
  lead_context?: unknown;
  curriculum_mode?: string | null;
  private_start_direction?: string | null;
  private_preferred_format?: string | null;
  conversion_evidence_slug?: string | null;
  source_lead_id?: string | null;
};

function attachListSummary(row: ConsultDbRow) {
  const content = typeof row.content === 'string' ? row.content : '';
  const summary = summarizeLeadRow({
    lead_route: row.lead_route ?? null,
    curriculum_mode: row.curriculum_mode ?? null,
    private_start_direction: row.private_start_direction ?? null,
    private_preferred_format: row.private_preferred_format ?? null,
    conversion_evidence_slug: row.conversion_evidence_slug ?? null,
    lead_context: (row.lead_context as never) ?? null,
    content,
    consult_type: row.consult_type,
  });

  // 목록: content 원문 제외. fallback parsing은 서버 summary에 반영됨.
  return { ...row, content: '', summary };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const url = req.nextUrl;
    const limitRaw = Number(url.searchParams.get('limit') ?? '200');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 500) : 200;
    const status = url.searchParams.get('status')?.trim() || '';

    const supabase = getServiceSupabase();

    let query = supabase
      .from('consultations')
      .select(CONSULT_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && ALLOWED_STATUS.has(status)) {
      query = query.eq('status', status);
    }

    const primary = await query;

    if (primary.error) {
      let legacyQuery = supabase
        .from('consultations')
        .select(CONSULT_SELECT_LEGACY)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (status && ALLOWED_STATUS.has(status)) {
        legacyQuery = legacyQuery.eq('status', status);
      }
      const fallback = await legacyQuery;
      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }
      const rows = ((fallback.data ?? []) as ConsultDbRow[]).map(attachListSummary);
      return NextResponse.json({ ok: true, rows, structured: false });
    }

    const rows = ((primary.data ?? []) as ConsultDbRow[]).map(attachListSummary);
    return NextResponse.json({ ok: true, rows, structured: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim() : '';
    if (!id || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ ok: false, error: 'id와 유효한 status가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const primary = await supabase
      .from('consultations')
      .update({ status })
      .eq('id', id)
      .select(CONSULT_SELECT)
      .maybeSingle();

    if (primary.error) {
      const fallback = await supabase
        .from('consultations')
        .update({ status })
        .eq('id', id)
        .select(CONSULT_SELECT_LEGACY)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }
      if (!fallback.data) {
        return NextResponse.json({ ok: false, error: '해당 상담을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, row: fallback.data });
    }

    if (!primary.data) {
      return NextResponse.json({ ok: false, error: '해당 상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, row: primary.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ ok: false, error: '삭제할 상담 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error, count } = await supabase
      .from('consultations')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ ok: false, error: '해당 상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
