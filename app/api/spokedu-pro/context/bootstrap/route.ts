/**
 * POST /api/spokedu-pro/context/bootstrap
 * 베타 관장단 승인 리드 이메일과 일치하는 로그인 사용자만 센터 + 14일 pro trialing 생성.
 * 이미 센터가 있으면 멱등 처리(구독 없을 때만 승인 리드 기준 pro trialing 보충).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

function normalizeUserEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const t = email.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

type LeadRow = {
  id: string;
  dojo_name: string;
  email: string | null;
  meta: unknown;
  status: string;
};

function isEligibleApprovedLeadRow(row: LeadRow): boolean {
  const meta =
    row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  const trialApproved = meta.trialApproved === true;
  const invited = row.status === 'trial_invited';
  if (!(trialApproved || invited)) return false;
  if (row.status === 'trial_started' || row.status === 'converted' || row.status === 'lost') return false;
  return true;
}

async function findEligibleApprovedLead(
  supabase: ReturnType<typeof getServiceSupabase>,
  emailNorm: string
): Promise<LeadRow | null> {
  const pat = escapeIlike(emailNorm);
  const { data: rows, error } = await supabase
    .from('spokedu_pro_leads')
    .select('id, dojo_name, email, meta, status, created_at')
    .ilike('email', pat)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('[bootstrap findLead]', error);
    return null;
  }
  for (const row of rows ?? []) {
    if (isEligibleApprovedLeadRow(row as LeadRow)) return row as LeadRow;
  }
  return null;
}

function trialNotApprovedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: 'trial_not_approved',
      message: 'SPOKEDU PRO 체험은 베타 관장단 신청 후 운영팀 승인으로 제공됩니다.',
    },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let bodyCenterName: string | undefined;
  try {
    const body = (await req.json()) as { centerName?: unknown };
    if (typeof body?.centerName === 'string' && body.centerName.trim()) bodyCenterName = body.centerName.trim();
  } catch {
    /* ignore */
  }

  const emailNorm = normalizeUserEmail(user.email ?? null);
  if (!emailNorm) {
    return NextResponse.json(
      {
        ok: false,
        error: 'email_required',
        message: '계정에 이메일이 없어 체험을 시작할 수 없습니다.',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('spokedu_pro_centers')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (existing) {
      const { data: sub } = await supabase
        .from('spokedu_pro_subscriptions')
        .select('id, plan, status')
        .eq('center_id', existing.id)
        .maybeSingle();

      if (sub) {
        return NextResponse.json({
          ok: true,
          bootstrapped: false,
          centerId: existing.id,
          centerName: existing.name,
        });
      }

      const approvedLead = await findEligibleApprovedLead(supabase, emailNorm);
      if (!approvedLead) {
        return trialNotApprovedResponse();
      }

      const trialEndAt = new Date(Date.now() + TRIAL_MS).toISOString();
      const { error: insErr } = await supabase.from('spokedu_pro_subscriptions').insert({
        center_id: existing.id,
        plan: 'pro',
        status: 'trialing',
        trial_end: trialEndAt,
        current_period_end: trialEndAt,
        max_classes: null,
      });
      if (insErr) {
        console.error('[bootstrap insert sub existing center]', insErr);
        return NextResponse.json({ error: 'subscription_create_failed', detail: insErr.message }, { status: 500 });
      }

      const now = new Date().toISOString();
      const prevMeta =
        approvedLead.meta && typeof approvedLead.meta === 'object' && !Array.isArray(approvedLead.meta)
          ? (approvedLead.meta as Record<string, unknown>)
          : {};
      const mergedLeadMeta: Record<string, unknown> = {
        ...prevMeta,
        trialStartedAt: now,
        trialEndAt,
        userId: user.id,
        centerId: existing.id,
        bootstrapSource: 'approved_lead_existing_center',
      };

      const { error: leadUpdErr } = await supabase
        .from('spokedu_pro_leads')
        .update({
          status: 'trial_started',
          trial_started_at: now,
          meta: mergedLeadMeta,
        })
        .eq('id', approvedLead.id)
        .neq('status', 'trial_started');

      if (leadUpdErr) {
        console.error('[bootstrap lead update existing center]', leadUpdErr);
      }

      return NextResponse.json({
        ok: true,
        bootstrapped: false,
        centerId: existing.id,
        centerName: existing.name,
        plan: 'pro',
        status: 'trialing',
        trialEndAt,
      });
    }

    const lead = await findEligibleApprovedLead(supabase, emailNorm);
    if (!lead) {
      return trialNotApprovedResponse();
    }

    const dojo = (lead.dojo_name ?? '').trim();
    const centerName = dojo || bodyCenterName || '내 도장';

    const { data: center, error: centerErr } = await supabase
      .from('spokedu_pro_centers')
      .insert({ owner_id: user.id, name: centerName })
      .select('id, name')
      .single();

    if (centerErr || !center) {
      return NextResponse.json({ error: 'center_create_failed', detail: centerErr?.message }, { status: 500 });
    }

    await supabase.from('spokedu_pro_center_members').insert({
      center_id: center.id,
      user_id: user.id,
      role: 'owner',
    });

    const trialEndAt = new Date(Date.now() + TRIAL_MS).toISOString();
    const { error: subErr } = await supabase.from('spokedu_pro_subscriptions').insert({
      center_id: center.id,
      plan: 'pro',
      status: 'trialing',
      trial_end: trialEndAt,
      current_period_end: trialEndAt,
      max_classes: null,
    });

    if (subErr) {
      console.error('[bootstrap subscription]', subErr);
      return NextResponse.json({ error: 'subscription_create_failed', detail: subErr.message }, { status: 500 });
    }

    const now = new Date().toISOString();
    const prevMeta =
      lead.meta && typeof lead.meta === 'object' && !Array.isArray(lead.meta)
        ? (lead.meta as Record<string, unknown>)
        : {};
    const mergedLeadMeta: Record<string, unknown> = {
      ...prevMeta,
      trialStartedAt: now,
      trialEndAt: trialEndAt,
      userId: user.id,
      centerId: center.id,
      bootstrapSource: 'approved_lead',
    };

    const { error: leadUpdErr } = await supabase
      .from('spokedu_pro_leads')
      .update({
        status: 'trial_started',
        trial_started_at: now,
        meta: mergedLeadMeta,
      })
      .eq('id', lead.id)
      .neq('status', 'trial_started');

    if (leadUpdErr) {
      console.error('[bootstrap lead update]', leadUpdErr);
    }

    return NextResponse.json(
      {
        ok: true,
        bootstrapped: true,
        centerId: center.id,
        centerName: center.name,
        plan: 'pro',
        status: 'trialing',
        trialEndAt,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
