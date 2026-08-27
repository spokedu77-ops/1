import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { summarizeLeadRow } from '@/app/lib/admin/leadInboxSummary';

const CONSULT_SELECT =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at, lead_route, lead_context, curriculum_mode, private_start_direction, private_preferred_format, conversion_evidence_slug, source_lead_id';

const CONSULT_SELECT_LEGACY =
  'id, parent_name, phone, child_age, content, consult_type, status, created_at';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: rawId } = await ctx.params;
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const primary = await supabase.from('consultations').select(CONSULT_SELECT).eq('id', id).maybeSingle();

    if (primary.error) {
      const fallback = await supabase
        .from('consultations')
        .select(CONSULT_SELECT_LEGACY)
        .eq('id', id)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }
      if (!fallback.data) {
        return NextResponse.json({ ok: false, error: '해당 상담을 찾을 수 없습니다.' }, { status: 404 });
      }
      const row = fallback.data;
      return NextResponse.json({
        ok: true,
        row: {
          ...row,
          summary: summarizeLeadRow({
            lead_route: null,
            curriculum_mode: null,
            private_start_direction: null,
            private_preferred_format: null,
            conversion_evidence_slug: null,
            lead_context: null,
            content: row.content ?? '',
            consult_type: row.consult_type,
          }),
        },
        structured: false,
      });
    }

    if (!primary.data) {
      return NextResponse.json({ ok: false, error: '해당 상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    const row = primary.data;
    return NextResponse.json({
      ok: true,
      row: {
        ...row,
        summary: summarizeLeadRow({
          lead_route: row.lead_route ?? null,
          curriculum_mode: row.curriculum_mode ?? null,
          private_start_direction: row.private_start_direction ?? null,
          private_preferred_format: row.private_preferred_format ?? null,
          conversion_evidence_slug: row.conversion_evidence_slug ?? null,
          lead_context: row.lead_context ?? null,
          content: row.content ?? '',
          consult_type: row.consult_type,
        }),
      },
      structured: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
