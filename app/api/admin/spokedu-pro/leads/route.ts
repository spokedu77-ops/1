import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const LEAD_STATUSES = ['new', 'contacted', 'trial_invited', 'trial_started', 'converted', 'lost'] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

const ADMIN_NOTE_MAX = 8000;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const interestedPlan = searchParams.get('interestedPlan');
    const q = (searchParams.get('q') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit') ?? '50');
    const offsetRaw = Number(searchParams.get('offset') ?? '0');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    if (status && !(LEAD_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let query = supabase.from('spokedu_pro_leads').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (interestedPlan && interestedPlan.length > 0) {
      query = query.eq('interested_plan', interestedPlan);
    }
    if (q.length > 0) {
      const qClean = q.replace(/,/g, ' ').slice(0, 80);
      const pat = `%${escapeIlike(qClean)}%`;
      query = query.or(
        `dojo_name.ilike.${pat},contact_name.ilike.${pat},phone.ilike.${pat},email.ilike.${pat}`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[admin/spokedu-pro/leads GET]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      leads: data ?? [],
      total: typeof count === 'number' ? count : 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
  }

  const statusRaw = body.status;
  const adminNoteRaw = body.adminNote;

  const hasStatus = statusRaw !== undefined && statusRaw !== null;
  const hasAdminNote = adminNoteRaw !== undefined;

  if (!hasStatus && !hasAdminNote) {
    return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
  }

  let nextStatus: LeadStatus | undefined;
  if (hasStatus) {
    if (typeof statusRaw !== 'string' || !(LEAD_STATUSES as readonly string[]).includes(statusRaw)) {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    }
    nextStatus = statusRaw as LeadStatus;
  }

  let adminNote: string | null | undefined;
  if (hasAdminNote) {
    if (adminNoteRaw !== null && typeof adminNoteRaw !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid_admin_note' }, { status: 400 });
    }
    if (adminNoteRaw === null) {
      adminNote = null;
    } else {
      const t = adminNoteRaw.trim();
      if (t.length === 0) {
        adminNote = null;
      } else {
        adminNote = t.length > ADMIN_NOTE_MAX ? t.slice(0, ADMIN_NOTE_MAX) : t;
      }
    }
  }

  const supabase = getServiceSupabase();
  const { data: existing, error: fetchErr } = await supabase
    .from('spokedu_pro_leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[admin/spokedu-pro/leads PATCH fetch]', fetchErr);
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (hasAdminNote) {
    patch.admin_note = adminNote;
  }

  if (nextStatus !== undefined) {
    patch.status = nextStatus;
    const nowIso = new Date().toISOString();
    if (nextStatus === 'contacted' && !existing.contacted_at) {
      patch.contacted_at = nowIso;
    }
    if (nextStatus === 'trial_started' && !existing.trial_started_at) {
      patch.trial_started_at = nowIso;
    }
    if (nextStatus === 'converted' && !existing.converted_at) {
      patch.converted_at = nowIso;
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('spokedu_pro_leads')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (updateErr) {
    console.error('[admin/spokedu-pro/leads PATCH]', updateErr);
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead: updated });
}
