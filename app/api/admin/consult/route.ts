import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const ALLOWED_STATUS = new Set(['pending', 'done']);

const CONSULT_SELECT =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at, lead_route, lead_context, curriculum_mode, private_start_direction, private_preferred_format, conversion_evidence_slug, source_lead_id';

const CONSULT_SELECT_LEGACY =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const primary = await supabase
      .from('consultations')
      .select(CONSULT_SELECT)
      .order('created_at', { ascending: false })
      .limit(500);

    if (primary.error) {
      const fallback = await supabase
        .from('consultations')
        .select(CONSULT_SELECT_LEGACY)
        .order('created_at', { ascending: false })
        .limit(500);
      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, rows: fallback.data ?? [], structured: false });
    }

    return NextResponse.json({ ok: true, rows: primary.data ?? [], structured: true });
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
