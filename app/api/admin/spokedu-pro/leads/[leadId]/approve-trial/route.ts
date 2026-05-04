import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { buildTrialInviteMessageTemplate, spokeduProAppOrigin } from '@/app/lib/server/spokeduProTrialInvite';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest, context: { params: Promise<{ leadId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { leadId } = await context.params;
  const id = String(leadId ?? '').trim();
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_lead_id' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: lead, error: fetchErr } = await supabase.from('spokedu_pro_leads').select('*').eq('id', id).maybeSingle();

  if (fetchErr) {
    console.error('[approve-trial fetch]', fetchErr);
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const emailRaw = typeof lead.email === 'string' ? lead.email.trim() : '';
  if (!emailRaw) {
    return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
  }

  if (lead.status === 'converted') {
    return NextResponse.json({ ok: false, error: 'already_converted' }, { status: 400 });
  }

  if (lead.status === 'trial_started') {
    return NextResponse.json({ ok: false, error: 'trial_already_started' }, { status: 400 });
  }

  const origin = spokeduProAppOrigin(req);
  const messageTemplate = buildTrialInviteMessageTemplate(
    { contact_name: lead.contact_name, email: lead.email },
    origin
  );

  if (lead.status === 'trial_invited') {
    return NextResponse.json({ ok: true, lead, messageTemplate });
  }

  if (lead.status !== 'new' && lead.status !== 'contacted') {
    return NextResponse.json({ ok: false, error: 'invalid_status_for_approval' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const prevMeta =
    lead.meta && typeof lead.meta === 'object' && !Array.isArray(lead.meta)
      ? (lead.meta as Record<string, unknown>)
      : {};

  const mergedMeta: Record<string, unknown> = {
    ...prevMeta,
    trialApproved: true,
    trialApprovedAt: now,
    trialApprovedBy: auth.userId,
    trialInviteEmail: emailRaw,
    trialPlan: 'pro',
    trialPlanLabel: 'All-in-One',
    trialPlanDisplayName: 'All-in-One 14일 프리미엄 체험',
    trialDays: 14,
    trialInvitePreparedAt: now,
    trialMessageTemplate: messageTemplate,
  };

  const { data: updated, error: updErr } = await supabase
    .from('spokedu_pro_leads')
    .update({
      status: 'trial_invited',
      meta: mergedMeta,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (updErr || !updated) {
    console.error('[approve-trial update]', updErr);
    return NextResponse.json({ ok: false, error: updErr?.message ?? 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead: updated, messageTemplate });
}
